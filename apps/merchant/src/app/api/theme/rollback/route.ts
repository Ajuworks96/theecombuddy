import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { themeService } from "@/lib/theme-service";

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const version = Number(body?.version);

    if (!version || isNaN(version) || version < 1) {
      return NextResponse.json(
        { error: "Valid target version number is required for rollback" },
        { status: 400 }
      );
    }

    const rolledBack = await themeService.rollbackToVersion(version, session.user.email);
    return NextResponse.json({
      message: `Theme successfully rolled back to version ${version}`,
      theme: rolledBack,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to rollback theme" },
      { status: 400 }
    );
  }
}
