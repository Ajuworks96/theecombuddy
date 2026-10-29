import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { medusaAdmin } from "@/lib/medusa-admin-client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const promotion = await medusaAdmin.getPromotion(session.token, id);
    return NextResponse.json({ promotion });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || `Failed to load promotion ${id}` },
      { status: err?.status || 500 }
    );
  }
}

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

    if (body.status === "active" || body.status === "inactive") {
      payload.status = body.status;
    }
    if (body.code && typeof body.code === "string") {
      payload.code = body.code.trim().toUpperCase();
    }

    const promotion = await medusaAdmin.updatePromotion(session.token, id, payload);
    return NextResponse.json({ promotion });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || `Failed to update promotion ${id}` },
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
    const result = await medusaAdmin.deletePromotion(session.token, id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || `Failed to delete promotion ${id}` },
      { status: err?.status || 500 }
    );
  }
}
