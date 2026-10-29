import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { themeService } from "@/lib/theme-service";

export async function POST(_req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const published = await themeService.publishTheme(session.user.email);
    return NextResponse.json({
      message: `Theme version ${published.version} published successfully`,
      theme: published,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to publish theme" },
      { status: 500 }
    );
  }
}
