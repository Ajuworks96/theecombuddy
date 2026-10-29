import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { medusaAdmin } from "@/lib/medusa-admin-client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const order = await medusaAdmin.getOrder(session.token, id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "canceled") {
      return NextResponse.json(
        { error: "Cannot confirm payment for a canceled order" },
        { status: 400 }
      );
    }

    const payCols = order.payment_collections || [];
    if (payCols.length === 0) {
      return NextResponse.json(
        { error: "No payment collection associated with this order" },
        { status: 400 }
      );
    }

    const targetCol = payCols[0];
    const uncapturedPayment = targetCol.payments?.find(
      (p) => !p.captured_at && !p.canceled_at
    );

    if (uncapturedPayment) {
      try {
        await medusaAdmin.capturePayment(session.token, uncapturedPayment.id, {});
      } catch (capErr: any) {
        // Fallback to markPaymentCollectionAsPaid if direct capture fails
        await medusaAdmin.markPaymentCollectionAsPaid(session.token, targetCol.id, {});
      }
    } else {
      await medusaAdmin.markPaymentCollectionAsPaid(session.token, targetCol.id, {});
    }

    const updatedOrder = await medusaAdmin.getOrder(session.token, id);
    return NextResponse.json({
      success: true,
      message: `Payment confirmed for Order #${order.display_id}`,
      order: updatedOrder,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || `Failed to confirm payment for order ${id}` },
      { status: err?.status || 500 }
    );
  }
}

