import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { medusaAdmin } from "@/lib/medusa-admin-client";

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const q = searchParams.get("q") || undefined;

  try {
    const data = await medusaAdmin.getInventoryItems(session.token, {
      limit,
      offset,
      q,
    });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load inventory items" },
      { status: err?.status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { inventoryItemId, locationId, quantity } = body;

    if (!inventoryItemId || typeof inventoryItemId !== "string") {
      return NextResponse.json(
        { error: "inventoryItemId is required" },
        { status: 400 }
      );
    }

    if (!locationId || typeof locationId !== "string") {
      return NextResponse.json(
        { error: "locationId is required" },
        { status: 400 }
      );
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 0) {
      return NextResponse.json(
        { error: "Invalid stocked_quantity: must be a non-negative integer" },
        { status: 400 }
      );
    }

    const inventoryItem = await medusaAdmin.updateInventoryLevel(
      session.token,
      inventoryItemId,
      locationId,
      qty
    );

    return NextResponse.json({ inventory_item: inventoryItem });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update inventory level" },
      { status: err?.status || 500 }
    );
  }
}

