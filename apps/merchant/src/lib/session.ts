/**
 * The Ecom Buddy — Merchant Admin Session Management
 * Provides secure, server-side HTTP-only session cookie access.
 */

import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "teb_admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export interface MerchantUserSession {
  token: string;
  user: {
    id: string;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
  };
  expiresAt: number;
}

/**
 * Parses and returns current authenticated merchant session from cookies
 */
export async function getSession(): Promise<MerchantUserSession | null> {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!rawCookie || !rawCookie.value) {
    return null;
  }

  try {
    const sessionData: MerchantUserSession = JSON.parse(
      Buffer.from(rawCookie.value, "base64").toString("utf-8")
    );

    if (!sessionData.token || !sessionData.user) {
      return null;
    }

    // Check expiration
    if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
      return null;
    }

    return sessionData;
  } catch {
    return null;
  }
}

/**
 * Stores session in a secure HTTP-only cookie
 */
export async function setSession(
  token: string,
  user: MerchantUserSession["user"]
): Promise<void> {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;

  const sessionData: MerchantUserSession = {
    token,
    user,
    expiresAt,
  };

  const encoded = Buffer.from(JSON.stringify(sessionData)).toString("base64");

  cookieStore.set(SESSION_COOKIE_NAME, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * Clears the merchant session cookie
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

