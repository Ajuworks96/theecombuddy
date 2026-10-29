import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { medusaAdmin } from "@/lib/medusa-admin-client";

export async function GET(_req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await medusaAdmin.getStockLocations(session.token);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load stock locations" },
      { status: err?.status || 500 }
    );
  }
}

