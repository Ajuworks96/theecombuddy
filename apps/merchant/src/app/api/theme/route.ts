import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { themeService } from "@/lib/theme-service";
import { THEME_PRESET_SPECS } from "@the-ecom-buddy/ui";

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") === "published" ? "published" : "draft";

  try {
    const theme = await themeService.getTheme(status);
    const history = await themeService.getHistory();

    return NextResponse.json({
      theme,
      presets: THEME_PRESET_SPECS,
      history,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load theme configuration" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid theme payload format" },
        { status: 400 }
      );
    }

    const updated = await themeService.saveDraft(body, session.user.email);
    return NextResponse.json({
      message: "Theme draft updated successfully",
      theme: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update theme draft" },
      { status: 500 }
    );
  }
}
