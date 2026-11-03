import { NextRequest, NextResponse } from "next/server";
import { validateCustomerSession } from "@/lib/customer-auth";

const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  "http://localhost:9000";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  process.env.MEDUSA_PUBLISHABLE_KEY ||
  "pk_ff34c9cc987ee5880382dba5c708c0e3613226919f08e1f5e3e43c9fd817266a";

export async function GET(req: NextRequest) {
  try {
    const session = await validateCustomerSession(req);
    if (!session.isAuthenticated || !session.token) {
      return NextResponse.json(
        { authenticated: false, error: session.error || "Unauthenticated session" },
        { status: 401 }
      );
    }
    const token = session.token;

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
    return NextResponse.json({
      authenticated: true,
      customer: data.customer,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to retrieve customer profile" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await validateCustomerSession(req);
    if (!session.isAuthenticated || !session.token) {
      return NextResponse.json(
        { error: session.error || "Unauthenticated session" },
        { status: 401 }
      );
    }
    const token = session.token;

    const body = await req.json().catch(() => ({}));
    const { first_name, last_name, phone } = body || {};

    const updatePayload: Record<string, any> = {};
    if (typeof first_name === "string") updatePayload.first_name = first_name.trim();
    if (typeof last_name === "string") updatePayload.last_name = last_name.trim();
    if (typeof phone === "string") updatePayload.phone = phone.trim();

    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/me`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify(updatePayload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.message || "Failed to update profile" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      customer: data.customer,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process profile update" },
      { status: 500 }
    );
  }
}
