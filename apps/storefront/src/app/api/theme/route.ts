import { NextResponse } from "next/server";
import { getPublishedTheme } from "@/lib/medusa-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const theme = await getPublishedTheme();
    if (!theme) {
      return NextResponse.json(
        { theme: null, error: "No published theme configured" },
        { status: 404 }
      );
    }

    return NextResponse.json({ theme });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load theme" },
      { status: 500 }
    );
  }
}

