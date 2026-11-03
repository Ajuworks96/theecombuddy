import { NextRequest, NextResponse } from "next/server";
import { getCustomerToken, revokeCustomerToken } from "@/lib/customer-auth";

export async function POST(req: NextRequest) {
  const token = getCustomerToken(req);
  if (token) {
    await revokeCustomerToken(token);
  }

  const response = NextResponse.json(
    { success: true, message: "Logged out successfully" },
    { status: 200 }
  );

  response.cookies.set({
    name: "teb_customer_token",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
