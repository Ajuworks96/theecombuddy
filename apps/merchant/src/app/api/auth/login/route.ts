import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { medusaAdmin, MedusaApiError } from "@/lib/medusa-admin-client";
import { setSession } from "@/lib/session";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Authenticate against official Medusa v2 Auth Provider
    const { token, user } = await medusaAdmin.login(email, password);

    // Securely set HTTP-only session cookie
    await setSession(token, user);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    });
  } catch (err: any) {
    if (err instanceof MedusaApiError) {
      const status = err.status === 401 ? 401 : 500;
      const message =
        err.status === 401
          ? "Invalid merchant credentials. Please verify email and password."
          : err.message;

      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json(
      { error: err?.message || "Internal authentication error" },
      { status: 500 }
    );
  }
}

