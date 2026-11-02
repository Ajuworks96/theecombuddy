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
      return NextResponse.json({ error: "Unauthenticated session" }, { status: 401 });
    }

    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/me?fields=*addresses`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to retrieve saved addresses" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(
      { addresses: data.customer?.addresses || [] },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to retrieve saved addresses" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthenticated session" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      first_name,
      last_name,
      address_1,
      address_2,
      city,
      province,
      postal_code,
      country_code,
      phone,
      is_default_shipping,
      is_default_billing,
    } = body || {};

    if (!first_name || !last_name || !address_1 || !city || !postal_code || !country_code) {
      return NextResponse.json(
        { error: "Required fields: first_name, last_name, address_1, city, postal_code, country_code" },
        { status: 400 }
      );
    }

    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/me/addresses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        first_name: String(first_name).trim(),
        last_name: String(last_name).trim(),
        address_1: String(address_1).trim(),
        address_2: address_2 ? String(address_2).trim() : undefined,
        city: String(city).trim(),
        province: province ? String(province).trim() : undefined,
        postal_code: String(postal_code).trim(),
        country_code: String(country_code).trim().toLowerCase(),
        phone: phone ? String(phone).trim() : undefined,
        is_default_shipping: Boolean(is_default_shipping),
        is_default_billing: Boolean(is_default_billing),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to add address" },
        { status: res.status }
      );
    }

    const createdAddress =
      data.address ||
      (Array.isArray(data.customer?.addresses)
        ? data.customer.addresses[data.customer.addresses.length - 1]
        : null);

    return NextResponse.json(
      {
        success: true,
        address: createdAddress,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to add address" },
      { status: 500 }
    );
  }
}
