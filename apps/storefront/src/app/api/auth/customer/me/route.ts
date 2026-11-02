import { NextRequest, NextResponse } from "next/server";

const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  "http://localhost:9000";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  process.env.MEDUSA_PUBLISHABLE_KEY ||
  "pk_ff34c9cc987ee5880382dba5c708c0e3613226919f08e1f5e3e43c9fd817266a";

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  const cookie = req.cookies.get("teb_customer_token");
  if (cookie && cookie.value) {
    return cookie.value.trim();
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json(
        { authenticated: false, error: "Unauthenticated session" },
        { status: 401 }
      );
    }

    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/me?fields=*addresses,*orders`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { authenticated: false, error: "Session expired or invalid" },
        { status: 401 }
      );
    }

    const data = await res.json();
    return NextResponse.json(
      {
        authenticated: true,
        customer: data.customer,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { authenticated: false, error: err.message || "Failed to retrieve customer profile" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthenticated session" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { first_name, last_name, phone, company_name } = body || {};

    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/me`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        first_name: first_name !== undefined ? String(first_name).trim() : undefined,
        last_name: last_name !== undefined ? String(last_name).trim() : undefined,
        phone: phone !== undefined ? String(phone).trim() : undefined,
        company_name: company_name !== undefined ? String(company_name).trim() : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to update profile" },
        { status: res.status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        customer: data.customer,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}

