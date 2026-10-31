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

    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/carts/${encodeURIComponent(cartId)}`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Cart not found or expired" },
        { status: res.status }
      );
    }

    const json = await res.json();
    return NextResponse.json({ cart: json.cart });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to retrieve cart" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let { region_id } = body || {};

    // If region_id not provided, fetch default (India/INR)
    if (!region_id) {
      const regRes = await fetch(`${MEDUSA_BACKEND_URL}/store/regions`, { headers });
      if (regRes.ok) {
        const regData = await regRes.json();
        region_id = regData.regions?.[0]?.id;
      }
    }

    if (!region_id) {
      return NextResponse.json(
        { error: "A valid region_id is required to create a cart" },
        { status: 400 }
      );
    }

    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/carts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ region_id }),
    });

    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: json.message || "Failed to initialize cart" },
        { status: res.status }
      );
    }

    return NextResponse.json({ cart: json.cart }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Cart creation failed" },
      { status: 500 }
    );
  }
}
