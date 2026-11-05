import { NextRequest, NextResponse } from "next/server";
import { validateCustomerSession } from "@/lib/customer-auth";

const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  "http://localhost:9000";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  process.env.MEDUSA_PUBLISHABLE_KEY ||
  "pk_cfee22fd52344d6a2f23778c3b1614b8e659a22bb4a58feb399864fde668e996";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: addressId } = await params;
    const session = await validateCustomerSession(req);
    if (!session.isAuthenticated || !session.token) {
      return NextResponse.json(
        { error: session.error || "Unauthenticated session" },
        { status: 401 }
      );
    }
    const token = session.token;

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

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.message || "Failed to update address" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      address: data.customer?.addresses?.find((a: any) => a.id === addressId) || data.address,
      customer: data.customer,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process update address request" },
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
    const session = await validateCustomerSession(req);
    if (!session.isAuthenticated || !session.token) {
      return NextResponse.json(
        { error: session.error || "Unauthenticated session" },
        { status: 401 }
      );
    }
    const token = session.token;

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

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.message || "Failed to delete address" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      id: addressId,
      message: "Address deleted successfully",
      customer: data.customer,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process delete address request" },
      { status: 500 }
    );
  }
}
