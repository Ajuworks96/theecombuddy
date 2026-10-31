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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const { searchParams } = new URL(req.url);
    const emailParam = searchParams.get("email");

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Security Gate: Guest order lookup requires matching recipient email
    if (!emailParam || !emailParam.trim()) {
      return NextResponse.json(
        {
          error: "Recipient email verification is required to view guest order information",
          requiresEmail: true,
        },
        { status: 403 }
      );
    }

    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/orders/${encodeURIComponent(orderId)}?fields=*items,*shipping_address,*billing_address,*shipping_methods,*payment_collections,*payment_collections.payments`,
      {
        headers,
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: res.status }
      );
    }

    const json = await res.json();
    const order = json.order;

    if (!order) {
      return NextResponse.json({ error: "Order record not found" }, { status: 404 });
    }

    // Verify email case-insensitively
    if (order.email && order.email.toLowerCase() !== emailParam.trim().toLowerCase()) {
      return NextResponse.json(
        { error: "Unauthorized: Email address does not match order records" },
        { status: 403 }
      );
    }

    return NextResponse.json({ order }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to retrieve order" },
      { status: 500 }
    );
  }
}
