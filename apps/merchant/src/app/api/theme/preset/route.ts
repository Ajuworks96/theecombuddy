import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { themeService } from "@/lib/theme-service";
import { ThemePresetId } from "@the-ecom-buddy/types";

const VALID_PRESETS: ThemePresetId[] = ["crescendo", "velora", "aero_step", "philox"];

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const presetId = body?.presetId as ThemePresetId;

    if (!presetId || !VALID_PRESETS.includes(presetId)) {
      return NextResponse.json(
        {
          error: `Invalid presetId '${presetId}'. Supported: ${VALID_PRESETS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const updated = await themeService.applyPreset(presetId, session.user.email);
    return NextResponse.json({
      message: `Theme preset '${presetId}' applied successfully`,
      theme: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to apply preset" },
      { status: 500 }
    );
  }
}
