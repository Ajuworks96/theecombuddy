import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { themeService } from "@/lib/theme-service";

export async function GET(_req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const theme = await themeService.getTheme("draft");
    return NextResponse.json({
      slides: theme.heroSlider?.slides || [],
      count: theme.heroSlider?.slides?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load hero slides" },
      { status: 500 }
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

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid slide payload format" },
        { status: 400 }
      );
    }

    if (!body.heading || typeof body.heading !== "string" || !body.heading.trim()) {
      return NextResponse.json(
        { error: "Slide heading is required" },
        { status: 400 }
      );
    }

    const slide = await themeService.addSlide(body, session.user.email);
    return NextResponse.json(
      {
        message: "Hero slide added successfully",
        slide,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to add hero slide" },
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

    // Check if reordering request
    if (Array.isArray(body?.slideIds)) {
      const reordered = await themeService.reorderSlides(body.slideIds, session.user.email);
      return NextResponse.json({
        message: "Hero slides reordered successfully",
        slides: reordered,
      });
    }

    // Individual slide update
    if (!body?.id) {
      return NextResponse.json(
        { error: "Slide ID or slideIds array is required" },
        { status: 400 }
      );
    }

    const updated = await themeService.updateSlide(body.id, body, session.user.email);
    return NextResponse.json({
      message: "Hero slide updated successfully",
      slide: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update hero slide" },
      { status: err?.message?.includes("not found") ? 404 : 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  let slideId = searchParams.get("id");

  if (!slideId) {
    try {
      const body = await req.json();
      slideId = body?.id;
    } catch {
      // ignore json parse error
    }
  }

  if (!slideId) {
    return NextResponse.json({ error: "Slide ID is required" }, { status: 400 });
  }

  try {
    await themeService.deleteSlide(slideId, session.user.email);
    return NextResponse.json({
      message: `Slide '${slideId}' deleted successfully`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to delete slide" },
      { status: err?.message?.includes("not found") ? 404 : 500 }
    );
  }
}
