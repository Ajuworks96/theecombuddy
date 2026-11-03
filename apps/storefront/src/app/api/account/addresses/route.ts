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
        { error: session.error || "Unauthenticated session" },
        { status: 401 }
      );
    }
    const token = session.token;

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
      { error: err.message || "Failed to process address request" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
    const {
      first_name,
      last_name,
      company,
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
        {
          error:
            "Missing required address fields: first_name, last_name, address_1, city, postal_code, and country_code are required.",
        },
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
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        company: company?.trim() || undefined,
        address_1: address_1.trim(),
        address_2: address_2?.trim() || undefined,
        city: city.trim(),
        province: province?.trim() || undefined,
        postal_code: postal_code.trim(),
        country_code: country_code.trim().toLowerCase(),
        phone: phone?.trim() || undefined,
        is_default_shipping: Boolean(is_default_shipping),
        is_default_billing: Boolean(is_default_billing),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.message || "Failed to add address" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const addresses = data.customer?.addresses || [];
    const addedAddress = addresses[addresses.length - 1];

    return NextResponse.json(
      {
        success: true,
        address: addedAddress || data.address,
        customer: data.customer,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process add address request" },
      { status: 500 }
    );
  }
}
