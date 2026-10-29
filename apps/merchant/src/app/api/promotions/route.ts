import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { medusaAdmin } from "@/lib/medusa-admin-client";

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const q = searchParams.get("q") || undefined;

  try {
    const data = await medusaAdmin.getPromotions(session.token, {
      limit,
      offset,
      q,
    });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load promotions" },
      { status: err?.status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (!body.code || typeof body.code !== "string" || !body.code.trim()) {
      return NextResponse.json(
        { error: "Promotion coupon code is required" },
        { status: 400 }
      );
    }

    const code = body.code.trim().toUpperCase();
    const type = body.type || "percentage"; // 'percentage' | 'fixed' | 'free_shipping'
    const isFreeShipping = type === "free_shipping";

    let value = Number(body.value);
    if (isFreeShipping) {
      value = 100;
    } else if (isNaN(value) || value <= 0) {
      return NextResponse.json(
        { error: "Discount value must be a positive number" },
        { status: 400 }
      );
    }

    if (type === "percentage" && value > 100) {
      return NextResponse.json(
        { error: "Percentage discount cannot exceed 100%" },
        { status: 400 }
      );
    }

    const application_method: any = {
      type: type === "fixed" ? "fixed" : "percentage",
      target_type: isFreeShipping ? "shipping_methods" : type === "fixed" ? "order" : "items",
      allocation: "across",
      value,
    };

    if (type === "fixed") {
      const curr = (body.currency_code || "inr").toLowerCase();
      application_method.currency_code = curr;
    } else if (body.currency_code) {
      application_method.currency_code = body.currency_code.toLowerCase();
    }

    if (body.max_quantity && Number(body.max_quantity) > 0) {
      application_method.max_quantity = Number(body.max_quantity);
    }

    const payload: any = {
      code,
      type: "standard",
      is_automatic: false,
      status: body.status === "inactive" ? "inactive" : "active",
      application_method,
    };

    if (body.campaign) {
      payload.campaign = body.campaign;
    }

    if (Array.isArray(body.rules) && body.rules.length > 0) {
      payload.rules = body.rules;
    }

    const promotion = await medusaAdmin.createPromotion(session.token, payload);
    return NextResponse.json({ promotion }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create promotion" },
      { status: err?.status || 500 }
    );
  }
}

