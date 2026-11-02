import { NextRequest, NextResponse } from "next/server";
import { sendNotification } from "@/lib/notifications";

const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  "http://localhost:9000";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  process.env.MEDUSA_PUBLISHABLE_KEY ||
  "pk_ff34c9cc987ee5880382dba5c708c0e3613226919f08e1f5e3e43c9fd817266a";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, first_name, last_name, phone } = body || {};

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Register credentials with Medusa auth identity provider
    const regRes = await fetch(`${MEDUSA_BACKEND_URL}/auth/customer/emailpass/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, password }),
    });

    const regData = await regRes.json();
    if (!regRes.ok || !regData.token) {
      return NextResponse.json(
        { error: regData.message || "Registration failed. An account with this email may already exist." },
        { status: regRes.status === 400 ? 409 : regRes.status }
      );
    }

    const regToken = regData.token;

    // 2. Create customer record bound to this auth identity
    const custRes = await fetch(`${MEDUSA_BACKEND_URL}/store/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${regToken}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        email: cleanEmail,
        first_name: first_name?.trim() || cleanEmail.split("@")[0],
        last_name: last_name?.trim() || "",
        phone: phone?.trim() || undefined,
      }),
    });

    const custData = await custRes.json();
    if (!custRes.ok || !custData.customer) {
      return NextResponse.json(
        { error: custData.message || "Failed to create customer profile" },
        { status: custRes.status }
      );
    }

    // 3. Log in to establish customer session JWT
    const loginRes = await fetch(`${MEDUSA_BACKEND_URL}/auth/customer/emailpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, password }),
    });

    const loginData = await loginRes.json();
    const sessionToken = loginData.token || regToken;

    // 4. Trigger customer registration notification (fails closed/logged if unconfigured)
    sendNotification({
      to: cleanEmail,
      type: "CUSTOMER_REGISTERED",
      data: { firstName: custData.customer.first_name, email: cleanEmail },
    }).catch(() => {});

    // 5. Return success and set secure HTTP-only cookie
    const response = NextResponse.json(
      {
        success: true,
        customer: custData.customer,
        token: sessionToken,
      },
      { status: 201 }
    );

    response.cookies.set({
      name: "teb_customer_token",
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 3600, // 7 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred during registration" },
      { status: 500 }
    );
  }
}

