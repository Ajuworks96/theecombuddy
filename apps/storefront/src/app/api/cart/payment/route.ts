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
    const { cart_id, provider_id = "pp_system_default" } = body || {};

    if (!cart_id || typeof cart_id !== "string") {
      return NextResponse.json({ error: "cart_id is required" }, { status: 400 });
    }

    // 1. Create or retrieve payment collection
    const pcRes = await fetch(`${MEDUSA_BACKEND_URL}/store/payment-collections`, {
      method: "POST",
      headers,
      body: JSON.stringify({ cart_id }),
    });

    const pcJson = await pcRes.json();
    if (!pcRes.ok) {
      return NextResponse.json(
        { error: pcJson.message || "Failed to initialize payment collection" },
        { status: pcRes.status }
      );
    }

    const paymentCollection = pcJson.payment_collection;
    if (!paymentCollection?.id) {
      return NextResponse.json(
        { error: "Payment collection was not returned by commerce engine" },
        { status: 500 }
      );
    }

    // 2. Create payment session for provider
    const psRes = await fetch(
      `${MEDUSA_BACKEND_URL}/store/payment-collections/${encodeURIComponent(paymentCollection.id)}/payment-sessions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ provider_id }),
      }
    );

    const psJson = await psRes.json();
    if (!psRes.ok) {
      return NextResponse.json(
        { error: psJson.message || `Failed to initiate payment session for ${provider_id}` },
        { status: psRes.status }
      );
    }

    return NextResponse.json(
      {
        payment_collection: psJson.payment_collection || paymentCollection,
        provider_id,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Payment session initialization failed" },
      { status: 500 }
    );
  }
}
