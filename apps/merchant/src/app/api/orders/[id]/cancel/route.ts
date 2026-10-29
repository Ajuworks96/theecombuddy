import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { medusaAdmin } from "@/lib/medusa-admin-client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existingOrder = await medusaAdmin.getOrder(session.token, id);
    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (existingOrder.status === "canceled") {
      return NextResponse.json(
        { error: "Order is already canceled" },
        { status: 400 }
      );
    }

    const result = await medusaAdmin.cancelOrder(session.token, id);
    return NextResponse.json({
      success: true,
      message: `Order #${existingOrder.display_id} canceled successfully. Inventory reservations reversed.`,
      order: result.order,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || `Failed to cancel order ${id}` },
      { status: err?.status || 500 }
    );
  }
}
