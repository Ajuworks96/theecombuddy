import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { medusaAdmin } from "@/lib/medusa-admin-client";

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const q = searchParams.get("q") || undefined;
  const status = searchParams.get("status") || undefined;
  const order = searchParams.get("order") || undefined;
  const paymentFilter = searchParams.get("payment_type") || undefined; // 'cod' | 'online' | 'pending_cod'

  try {
    const data = await medusaAdmin.getOrders(session.token, {
      limit,
      offset,
      q,
      status: status && status !== "all" ? status : undefined,
      order,
    });

    let filteredOrders = data.orders || [];

    // Filter by COD or payment type if requested
    if (paymentFilter === "cod") {
      filteredOrders = filteredOrders.filter((o) => {
        const hasCodPayment = o.payment_collections?.some((pc) =>
          pc.payments?.some(
            (p) =>
              p.provider_id.includes("system") ||
              p.provider_id.includes("manual") ||
              p.provider_id.includes("cod")
          )
        );
        return hasCodPayment;
      });
    } else if (paymentFilter === "pending_cod") {
      filteredOrders = filteredOrders.filter((o) => {
        const isCanceled = o.status === "canceled";
        if (isCanceled) return false;
        const hasCodPayment = o.payment_collections?.some((pc) =>
          pc.payments?.some(
            (p) =>
              (p.provider_id.includes("system") ||
                p.provider_id.includes("manual") ||
                p.provider_id.includes("cod")) &&
              !p.captured_at
          )
        );
        return hasCodPayment;
      });
    } else if (paymentFilter === "online") {
      filteredOrders = filteredOrders.filter((o) => {
        const hasOnline = o.payment_collections?.some((pc) =>
          pc.payments?.some((p) => p.provider_id.includes("razorpay"))
        );
        return hasOnline;
      });
    }

    return NextResponse.json({
      orders: filteredOrders,
      count: paymentFilter ? filteredOrders.length : data.count,
      limit: data.limit,
      offset: data.offset,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load orders" },
      { status: err?.status || 500 }
    );
  }
}
