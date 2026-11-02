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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: addressId } = await params;
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthenticated session" }, { status: 401 });
    }

    if (!addressId) {
      return NextResponse.json({ error: "Address ID is required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/me/addresses/${encodeURIComponent(addressId)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to update address" },
        { status: res.status }
      );
    }

    const updatedAddress =
      data.address ||
      (Array.isArray(data.customer?.addresses)
        ? data.customer.addresses.find((a: any) => a.id === addressId)
        : null);

    return NextResponse.json(
      { success: true, address: updatedAddress },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update address" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: addressId } = await params;
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthenticated session" }, { status: 401 });
    }

    if (!addressId) {
      return NextResponse.json({ error: "Address ID is required" }, { status: 400 });
    }

    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/me/addresses/${encodeURIComponent(addressId)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to delete address" },
        { status: res.status }
      );
    }

    return NextResponse.json(
      { success: true, id: addressId },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete address" },
      { status: 500 }
    );
  }
}
