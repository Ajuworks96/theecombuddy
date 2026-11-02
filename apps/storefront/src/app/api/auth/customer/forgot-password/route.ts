import { NextRequest, NextResponse } from "next/server";
import { sendNotification, isNotificationConfigured } from "@/lib/notifications";

const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  "http://localhost:9000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body || {};

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Call Medusa reset password workflow
    const res = await fetch(`${MEDUSA_BACKEND_URL}/auth/customer/emailpass/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: cleanEmail }),
    });

    // Dispatch notification
    const notifResult = await sendNotification({
      to: cleanEmail,
      type: "PASSWORD_RESET",
      data: { email: cleanEmail },
    });

    const isConfigured = isNotificationConfigured();

    return NextResponse.json(
      {
        success: true,
        message: "If an account exists for this email, password reset instructions have been sent.",
        notification_delivered: notifResult.status === "sent",
        notification_status: notifResult.status,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to initiate password reset" },
      { status: 500 }
    );
  }
}

