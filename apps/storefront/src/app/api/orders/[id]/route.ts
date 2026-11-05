import { NextRequest, NextResponse } from "next/server";
import { verifyGuestOrderToken, extractGuestOrderToken } from "@/lib/guest-order-token";

const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  "http://localhost:9000";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  process.env.MEDUSA_PUBLISHABLE_KEY ||
  "pk_cfee22fd52344d6a2f23778c3b1614b8e659a22bb4a58feb399864fde668e996";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // 1. Extract token from header or HTTP-only cookie
    const token = extractGuestOrderToken(req, orderId);

    if (!token) {
      return NextResponse.json(
        {
          error: "Access denied: guest order access requires a valid guest access token or verified-email OTP",
          requiresVerification: true,
        },
        { status: 401 }
      );
    }

    // 2. Cryptographically verify guest order token
    const verification = verifyGuestOrderToken(token, orderId);
    if (!verification.valid) {
      return NextResponse.json(
        {
          error: `Unauthorized guest order access: ${verification.error}`,
          requiresVerification: true,
        },
        { status: 401 }
      );
    }

    // 3. Query Medusa Store API with authenticated guest token
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/orders/${encodeURIComponent(orderId)}?fields=*items,*shipping_address,*billing_address,*shipping_methods,*payment_collections,*payment_collections.payments`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": PUBLISHABLE_KEY,
          "x-guest-order-token": token,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: errJson.message || "Order record not found" },
        { status: res.status }
      );
    }

    const json = await res.json();
    const order = json.order;

    if (!order) {
      return NextResponse.json({ error: "Order record not found" }, { status: 404 });
    }

    // 4. Sanitize and mask sensitive information
    if (order.shipping_address?.phone) {
      const phone = String(order.shipping_address.phone);
      if (phone.length > 5) {
        order.shipping_address.phone = phone.slice(0, 3) + "******" + phone.slice(-3);
      }
    }

    return NextResponse.json({ order }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to retrieve order" },
      { status: 500 }
    );
  }
}
