import { NextRequest, NextResponse } from "next/server";

const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  "http://localhost:9000";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  process.env.MEDUSA_PUBLISHABLE_KEY ||
  "pk_ff34c9cc987ee5880382dba5c708c0e3613226919f08e1f5e3e43c9fd817266a";

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  const cookie = req.cookies.get("teb_customer_token");
  if (cookie && cookie.value) {
    return cookie.value.trim();
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const token = extractToken(req);

    if (!token) {
      return NextResponse.json({ error: "Unauthenticated session" }, { status: 401 });
    }

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
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.message || "Access denied or order not found" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const order = data.order;

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Process shipments and tracking labels
    const shipments = (order.fulfillments || []).map((f: any) => ({
      id: f.id,
      created_at: f.created_at,
      shipped_at: f.shipped_at || f.created_at,
      carrier: f.labels?.[0]?.tracking_number ? "Standard Courier" : "Pending Dispatch",
      tracking_number: f.labels?.[0]?.tracking_number || null,
      tracking_url: f.labels?.[0]?.tracking_url || null,
    }));

    return NextResponse.json(
      {
        order,
        shipments,
        is_tracking_available: shipments.some((s: any) => Boolean(s.tracking_number)),
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to retrieve order" },
      { status: 500 }
    );
  }
}

