import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { medusaAdmin } from "@/lib/medusa-admin-client";

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const q = searchParams.get("q") || undefined;

  try {
    const data = await medusaAdmin.getCustomers(session.token, {
      limit,
      offset,
      q,
    });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load customers" },
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

    if (!body.email || typeof body.email !== "string" || !body.email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    const payload: any = {
      email: body.email.trim().toLowerCase(),
    };

    if (body.first_name) payload.first_name = body.first_name.trim();
    if (body.last_name) payload.last_name = body.last_name.trim();
    if (body.phone) payload.phone = body.phone.trim();

    const customer = await medusaAdmin.createCustomer(session.token, payload);
    return NextResponse.json({ customer }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create customer" },
      { status: err?.status || 500 }
    );
  }
}

