import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { medusaAdmin } from "@/lib/medusa-admin-client";

const SUPPORTED_CURRENCIES = new Set(["inr", "usd", "aed", "gbp", "eur"]);

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (!Array.isArray(body.updates) || body.updates.length === 0) {
      return NextResponse.json(
        { error: "At least one variant price update is required" },
        { status: 400 }
      );
    }

    // Validation pass
    for (const item of body.updates) {
      if (!item.productId || !item.variantId) {
        return NextResponse.json(
          { error: "Each price update must specify both productId and variantId" },
          { status: 400 }
        );
      }

      if (!Array.isArray(item.prices) || item.prices.length === 0) {
        return NextResponse.json(
          { error: `Variant ${item.variantId} missing prices array` },
          { status: 400 }
        );
      }

      for (const pr of item.prices) {
        const curr = String(pr.currency_code || "").toLowerCase();
        if (!SUPPORTED_CURRENCIES.has(curr)) {
          return NextResponse.json(
            { error: `Currency mismatch: Unsupported currency '${curr}'. Supported: INR, USD, AED, GBP, EUR.` },
            { status: 400 }
          );
        }

        const amt = Number(pr.amount);
        if (isNaN(amt) || amt < 0) {
          return NextResponse.json(
            { error: `Invalid price amount for currency '${curr}': must be a non-negative number` },
            { status: 400 }
          );
        }
      }
    }

    // Execution pass
    let updatedCount = 0;
    for (const item of body.updates) {
      const pricesPayload = item.prices.map((p: any) => ({
        currency_code: p.currency_code.toLowerCase(),
        amount: Number(p.amount),
      }));

      await medusaAdmin.updateVariant(session.token, item.productId, item.variantId, {
        prices: pricesPayload,
      });
      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated pricing for ${updatedCount} variant(s)`,
      updatedCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update bulk pricing" },
      { status: err?.status || 500 }
    );
  }
}

