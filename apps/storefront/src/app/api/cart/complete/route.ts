import { NextRequest, NextResponse } from "next/server";
import { acquireCartLock, releaseCartLock, markCartCompleted, getCompletedCartOrder } from "@/lib/cart-lock";
import { createGuestOrderToken } from "@/lib/guest-order-token";

const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  "http://localhost:9000";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  process.env.MEDUSA_PUBLISHABLE_KEY ||
  "pk_cfee22fd52344d6a2f23778c3b1614b8e659a22bb4a58feb399864fde668e996";

const headers = {
  "Content-Type": "application/json",
  "x-publishable-api-key": PUBLISHABLE_KEY,
};

export async function POST(req: NextRequest) {
  let cartIdToUnlock: string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    const { cart_id } = body || {};

    if (!cart_id || typeof cart_id !== "string") {
      return NextResponse.json({ error: "cart_id is required" }, { status: 400 });
    }

    // 1. Fast cache check: Reject if already completed in memory/cache
    const existingOrderId = await getCompletedCartOrder(cart_id);
    if (existingOrderId) {
      return NextResponse.json(
        { error: "Cart has already been completed. Duplicate submission rejected." },
        { status: 400 }
      );
    }

    // 2. Concurrency Lock: Prevent simultaneous double-click submissions
    const lockAcquired = await acquireCartLock(cart_id, 25000);
    if (!lockAcquired) {
      return NextResponse.json(
        { error: "Order completion is already in progress for this cart. Please wait." },
        { status: 409 }
      );
    }
    cartIdToUnlock = cart_id;

    // 3. Pre-check: Verify Medusa state if cart.completed_at is already set
    try {
      const checkRes = await fetch(
        `${MEDUSA_BACKEND_URL}/store/carts/${encodeURIComponent(cart_id)}`,
        { headers, cache: "no-store" }
      );
      if (checkRes.ok) {
        const checkJson = await checkRes.json();
        if (checkJson.cart?.completed_at) {
          return NextResponse.json(
            { error: "Cart has already been completed. Duplicate submission rejected." },
            { status: 400 }
          );
        }
      }
    } catch (checkErr) {
      console.warn("[cart/complete] Pre-check warning:", checkErr);
    }

    // 4. Invoke Medusa complete workflow with Idempotency-Key
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/carts/${encodeURIComponent(cart_id)}/complete`,
      {
        method: "POST",
        headers: {
          ...headers,
          "Idempotency-Key": `complete_cart_${cart_id}`,
        },
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: json.message || "Failed to complete order" },
        { status: res.status }
      );
    }

    if (json.type === "cart") {
      return NextResponse.json(
        {
          error: json.error?.message || "Order completion could not finalize payment session",
          type: "cart",
        },
        { status: 400 }
      );
    }

    const order = json.order;
    if (!order?.id) {
      return NextResponse.json(
        { error: "Order was not generated upon cart completion" },
        { status: 500 }
      );
    }

    // 5. Record cart completion in lock manager
    markCartCompleted(cart_id, order.id);

    // 6. Generate cryptographically signed guest access token
    const guestToken = createGuestOrderToken(order.id, order.email || "", 3600);

    // 7. Issue secure HTTP-only cookie
    const response = NextResponse.json(
      {
        type: "order",
        order,
        guest_token: guestToken,
        guest_order_token: guestToken,
      },
      { status: 200 }
    );

    response.cookies.set({
      name: `teb_guest_order_${order.id}`,
      value: guestToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 3600, // 1 hour
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Cart order completion encountered an unexpected failure" },
      { status: 500 }
    );
  } finally {
    if (cartIdToUnlock) {
      await releaseCartLock(cartIdToUnlock);
    }
  }
}
