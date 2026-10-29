import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { medusaAdmin } from "@/lib/medusa-admin-client";

export async function GET(_req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await medusaAdmin.getCategories(session.token);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load categories" },
      { status: err?.status || 500 }
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

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    const payload: any = {
      name: body.name.trim(),
    };

    if (body.handle) {
      payload.handle = body.handle.trim();
    }
    if (body.description) {
      payload.description = body.description.trim();
    }
    if (body.parent_category_id) {
      payload.parent_category_id = body.parent_category_id;
    }
    if (typeof body.is_active === "boolean") {
      payload.is_active = body.is_active;
    }

    const category = await medusaAdmin.createCategory(session.token, payload);
    return NextResponse.json({ product_category: category }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create category" },
      { status: err?.status || 500 }
    );
  }
}
