import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { medusaAdmin } from "@/lib/medusa-admin-client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fulfillmentId: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, fulfillmentId } = await params;

  try {
    const body = await req.json();

    const payload: any = {
      items: body.items || [],
    };

    if (Array.isArray(body.labels) && body.labels.length > 0) {
      payload.labels = body.labels;
    } else if (body.tracking_number) {
      payload.labels = [
        {
          tracking_number: String(body.tracking_number),
          tracking_url: body.tracking_url || `https://track.shipment/${body.tracking_number}`,
          label_url: body.label_url || `https://track.shipment/label/${body.tracking_number}`,
        },
      ];
    }

    const result = await medusaAdmin.createOrderShipment(
      session.token,
      id,
      fulfillmentId,
      payload
    );

    return NextResponse.json({ success: true, order: result.order });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || `Failed to record shipment for fulfillment ${fulfillmentId}` },
      { status: err?.status || 500 }
    );
  }
}
