import { NextRequest, NextResponse } from "next/server";
import { validateCustomerSession } from "@/lib/customer-auth";

const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  "http://localhost:9000";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  process.env.MEDUSA_PUBLISHABLE_KEY ||
  "pk_cfee22fd52344d6a2f23778c3b1614b8e659a22bb4a58feb399864fde668e996";

export async function GET(req: NextRequest) {
  try {
    const session = await validateCustomerSession(req);
    if (!session.isAuthenticated || !session.token) {
      return NextResponse.json(
        { error: session.error || "Unauthenticated session" },
        { status: 401 }
      );
    }
    const token = session.token;

    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/orders?fields=*items,*shipping_address,*payment_collections,*payment_collections.payments,*fulfillments,*fulfillments.labels&order=-created_at`,
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
      return NextResponse.json(
        { error: "Failed to retrieve order history" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      orders: data.orders || [],
      count: data.count || (data.orders ? data.orders.length : 0),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process customer orders" },
      { status: 500 }
    );
  }
}
