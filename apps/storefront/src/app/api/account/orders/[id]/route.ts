import { NextRequest, NextResponse } from "next/server";
import { validateCustomerSession } from "@/lib/customer-auth";

const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  "http://localhost:9000";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  process.env.MEDUSA_PUBLISHABLE_KEY ||
  "pk_ff34c9cc987ee5880382dba5c708c0e3613226919f08e1f5e3e43c9fd817266a";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const session = await validateCustomerSession(req);
    if (!session.isAuthenticated || !session.token) {
      return NextResponse.json(
        { error: session.error || "Unauthenticated session" },
        { status: 401 }
      );
    }
    const token = session.token;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/orders/${encodeURIComponent(orderId)}?fields=*items,*shipping_address,*billing_address,*payment_collections,*payment_collections.payments,*fulfillments,*fulfillments.labels,*fulfillments.items`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-publishable-api-key": PUBLISHABLE_KEY,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.message || "Failed to retrieve order details" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      order: data.order,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process order details request" },
      { status: 500 }
    );
  }
}
