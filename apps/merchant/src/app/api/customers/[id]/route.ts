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
    const customer = await medusaAdmin.getCustomer(session.token, id);
    return NextResponse.json({ customer });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || `Failed to load customer ${id}` },
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

    if (body.first_name !== undefined) payload.first_name = body.first_name ? body.first_name.trim() : null;
    if (body.last_name !== undefined) payload.last_name = body.last_name ? body.last_name.trim() : null;
    if (body.phone !== undefined) payload.phone = body.phone ? body.phone.trim() : null;

    const customer = await medusaAdmin.updateCustomer(session.token, id, payload);
    return NextResponse.json({ customer });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || `Failed to update customer ${id}` },
      { status: err?.status || 500 }
    );
  }
}
