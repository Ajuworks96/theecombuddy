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
    const body = await req.json();

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required for fulfillment" },
        { status: 400 }
      );
    }

    const payload: any = {
      items: body.items.map((it: any) => ({
        id: it.id,
        quantity: Math.max(1, Number(it.quantity) || 1),
      })),
    };

    if (body.location_id) {
      payload.location_id = body.location_id;
    }

    const result = await medusaAdmin.createOrderFulfillment(session.token, id, payload);
    return NextResponse.json({ success: true, order: result.order }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || `Failed to create fulfillment for order ${id}` },
      { status: err?.status || 500 }
    );
  }
}

