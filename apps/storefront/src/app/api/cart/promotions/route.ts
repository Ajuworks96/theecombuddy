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
    const { cart_id, promo_code } = body || {};

    if (!cart_id || typeof cart_id !== "string") {
      return NextResponse.json({ error: "cart_id is required" }, { status: 400 });
    }

    if (!promo_code || typeof promo_code !== "string") {
      return NextResponse.json({ error: "promo_code is required" }, { status: 400 });
    }

    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/carts/${encodeURIComponent(cart_id)}/promotions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ promo_codes: [promo_code.trim()] }),
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: json.message || `The promotion code ${promo_code} is invalid or expired` },
        { status: res.status }
      );
    }

    return NextResponse.json({ cart: json.cart }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to apply promotion" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { searchParams } = new URL(req.url);
    const cart_id = body.cart_id || searchParams.get("cart_id");
    const promo_code = body.promo_code || searchParams.get("promo_code");

    if (!cart_id || typeof cart_id !== "string") {
      return NextResponse.json({ error: "cart_id is required" }, { status: 400 });
    }

    if (!promo_code || typeof promo_code !== "string") {
      return NextResponse.json({ error: "promo_code is required" }, { status: 400 });
    }

    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/carts/${encodeURIComponent(cart_id)}/promotions`,
      {
        method: "DELETE",
        headers,
        body: JSON.stringify({ promo_codes: [promo_code.trim()] }),
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: json.message || "Failed to remove promotion" },
        { status: res.status }
      );
    }

    return NextResponse.json({ cart: json.cart }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to remove promotion" },
      { status: 500 }
    );
  }
}
