import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { medusaAdmin } from "@/lib/medusa-admin-client";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await medusaAdmin.getDashboardStats(session.token);
    return NextResponse.json(stats);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load dashboard statistics" },
      { status: err?.status || 500 }
    );
  }
}
