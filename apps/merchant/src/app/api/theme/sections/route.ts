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
      sections: theme.sections || [],
      count: theme.sections?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load homepage sections" },
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

    // Check if reordering array
    if (Array.isArray(body?.sectionIds)) {
      const reordered = await themeService.reorderSections(body.sectionIds, session.user.email);
      return NextResponse.json({
        message: "Homepage sections reordered successfully",
        sections: reordered,
      });
    }

    // Individual section toggle/update
    if (body?.id) {
      const draft = await themeService.getTheme("draft");
      const sections = draft.sections || [];
      const index = sections.findIndex((s) => s.id === body.id);

      if (index === -1) {
        return NextResponse.json(
          { error: `Section '${body.id}' not found` },
          { status: 404 }
        );
      }

      sections[index] = {
        ...sections[index],
        isEnabled: typeof body.isEnabled === "boolean" ? body.isEnabled : sections[index].isEnabled,
        title: body.title || sections[index].title,
        subtitle: body.subtitle !== undefined ? body.subtitle : sections[index].subtitle,
        config: { ...(sections[index].config || {}), ...(body.config || {}) },
      };

      await themeService.saveDraft({ sections }, session.user.email);
      return NextResponse.json({
        message: "Homepage section updated successfully",
        section: sections[index],
      });
    }

    return NextResponse.json(
      { error: "Payload must contain sectionIds array or section update object" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update homepage sections" },
      { status: 500 }
    );
  }
}
