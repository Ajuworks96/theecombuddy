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
    const { cart_id, variant_id, quantity = 1 } = body || {};

    if (!cart_id || typeof cart_id !== "string") {
      return NextResponse.json({ error: "cart_id is required" }, { status: 400 });
    }

    if (!variant_id || typeof variant_id !== "string") {
      return NextResponse.json({ error: "variant_id is required" }, { status: 400 });
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1 || qty > 100) {
      return NextResponse.json(
        { error: "Quantity must be a positive integer between 1 and 100" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/carts/${encodeURIComponent(cart_id)}/line-items`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ variant_id, quantity: qty }),
      }
    );

    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        {
          error: json.message || "Failed to add item to bag due to stock limitations",
          code: json.code,
        },
        { status: res.status }
      );
    }

    return NextResponse.json({ cart: json.cart }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Line item addition failed" },
      { status: 500 }
    );
  }
}
