import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { medusaAdmin } from "@/lib/medusa-admin-client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleUpdate(req, params);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleUpdate(req, params);
}

async function handleUpdate(
  req: NextRequest,
  paramsPromise: Promise<{ id: string }>
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await paramsPromise;

  try {
    const body = await req.json();
    const payload: any = {};

    if (body.name) payload.name = body.name.trim();
    if (body.handle) payload.handle = body.handle.trim();
    if (body.description !== undefined) payload.description = body.description;
    if (body.parent_category_id !== undefined) payload.parent_category_id = body.parent_category_id;
    if (typeof body.is_active === "boolean") payload.is_active = body.is_active;

    const category = await medusaAdmin.updateCategory(session.token, id, payload);
    return NextResponse.json({ product_category: category });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || `Failed to update category ${id}` },
      { status: err?.status || 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await medusaAdmin.deleteCategory(session.token, id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || `Failed to delete category ${id}` },
      { status: err?.status || 500 }
    );
  }
}

