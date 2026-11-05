import { NextRequest, NextResponse } from "next/server";

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
  try {
    const body = await req.json().catch(() => ({}));
    const { cart_id, provider_id = "pp_system_default" } = body || {};

    if (!cart_id || typeof cart_id !== "string") {
      return NextResponse.json({ error: "cart_id is required" }, { status: 400 });
    }

    // 1. Fetch cart to enforce payment and market rules
    const cartRes = await fetch(
      `${MEDUSA_BACKEND_URL}/store/carts/${encodeURIComponent(cart_id)}`,
      {
        headers,
        cache: "no-store",
      }
    );

    if (!cartRes.ok) {
      return NextResponse.json(
        { error: "Cart not found or expired" },
        { status: cartRes.status }
      );
    }

    const cartJson = await cartRes.json();
    const cart = cartJson.cart;

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    // Rule: Cash on Delivery (COD) is strictly restricted to India (Domestic Market Only)
    const isDomesticIndia =
      cart.currency_code?.toLowerCase() === "inr" ||
      cart.shipping_address?.country_code?.toLowerCase() === "in";

    if (provider_id === "pp_system_default" && !isDomesticIndia) {
      return NextResponse.json(
        {
          error:
            "Cash on Delivery (COD) is only available for domestic delivery within India (INR). International orders require online payment.",
        },
        { status: 400 }
      );
    }

    // Rule: Cashfree is restricted to domestic INR orders
    if ((provider_id === "pp_cashfree_cashfree" || provider_id === "cashfree") && !isDomesticIndia) {
      return NextResponse.json(
        {
          error:
            "Cashfree payments are only available for domestic delivery in INR within India.",
        },
        { status: 400 }
      );
    }

    // Rule: Shipping destination country and cart currency/region must agree
    if (cart.shipping_address?.country_code) {
      const shippingCountry = cart.shipping_address.country_code.toLowerCase();
      if (shippingCountry === "in" && cart.currency_code?.toLowerCase() !== "inr") {
        return NextResponse.json(
          {
            error: "Destination mismatch: Deliveries to India require checkout in INR currency.",
          },
          { status: 400 }
        );
      }
      if (shippingCountry !== "in" && cart.currency_code?.toLowerCase() === "inr") {
        return NextResponse.json(
          {
            error:
              "Destination mismatch: International delivery requires destination market currency.",
          },
          { status: 400 }
        );
      }
    }

    // 2. Create or retrieve payment collection
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

    // 3. Create payment session for provider
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
