import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { medusaAdmin } from "@/lib/medusa-admin-client";

export async function GET(_req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await medusaAdmin.getCollections(session.token);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load collections" },
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

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Collection title is required" },
        { status: 400 }
      );
    }

    const payload: any = {
      title: body.title.trim(),
    };

    if (body.handle) {
      payload.handle = body.handle.trim();
    }

    const collection = await medusaAdmin.createCollection(session.token, payload);
    return NextResponse.json({ collection }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create collection" },
      { status: err?.status || 500 }
    );
  }
}

