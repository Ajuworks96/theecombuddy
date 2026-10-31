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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cartId = searchParams.get("cart_id");

    if (!cartId) {
      return NextResponse.json({ error: "cart_id is required" }, { status: 400 });
    }

    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/shipping-options?cart_id=${encodeURIComponent(cartId)}`,
      {
        headers,
        cache: "no-store",
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: json.message || "Failed to retrieve shipping options" },
        { status: res.status }
      );
    }

    return NextResponse.json({ shipping_options: json.shipping_options || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load shipping options" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { cart_id, option_id } = body || {};

    if (!cart_id || typeof cart_id !== "string") {
      return NextResponse.json({ error: "cart_id is required" }, { status: 400 });
    }

    if (!option_id || typeof option_id !== "string") {
      return NextResponse.json({ error: "option_id is required" }, { status: 400 });
    }

    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/carts/${encodeURIComponent(cart_id)}/shipping-methods`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ option_id }),
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: json.message || "Failed to set shipping method" },
        { status: res.status }
      );
    }

    return NextResponse.json({ cart: json.cart }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to set shipping method" },
      { status: 500 }
    );
  }
}
