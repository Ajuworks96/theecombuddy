import { NextRequest, NextResponse } from "next/server";

const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  "http://localhost:9000";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  process.env.MEDUSA_PUBLISHABLE_KEY ||
  "pk_ff34c9cc987ee5880382dba5c708c0e3613226919f08e1f5e3e43c9fd817266a";

const headers = {
  "Content-Type": "application/json",
  "x-publishable-api-key": PUBLISHABLE_KEY,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { cart_id } = body || {};

    if (!cart_id || typeof cart_id !== "string") {
      return NextResponse.json({ error: "cart_id is required" }, { status: 400 });
    }

    // Pre-check: prevent duplicate submissions if cart is already completed
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

    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/carts/${encodeURIComponent(cart_id)}/complete`,
      {
        method: "POST",
        headers,
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

    return NextResponse.json(
      {
        type: "order",
        order: json.order,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Cart order completion encountered an unexpected failure" },
      { status: 500 }
    );
  }
}
