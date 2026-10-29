import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { medusaAdmin } from "@/lib/medusa-admin-client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const order = await medusaAdmin.getOrder(session.token, id);
    return NextResponse.json({ order });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || `Failed to load order ${id}` },
      { status: err?.status || 500 }
    );
  }
}

