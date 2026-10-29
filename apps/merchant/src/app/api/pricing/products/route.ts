import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { medusaAdmin } from "@/lib/medusa-admin-client";
import { fxService } from "@/lib/fx-service";

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const q = searchParams.get("q") || undefined;

  try {
    const [productsRes, fxSettings] = await Promise.all([
      medusaAdmin.getProducts(session.token, {
        limit,
        offset,
        q,
        fields: "*variants,*variants.prices",
      }),
      fxService.getSettings(),
    ]);

    const products = productsRes.products || [];

    // Format products and variants with their multi-currency price matrix
    const items = products.map((product) => {
      const variants = (product.variants || []).map((v) => {
        const pricesByCurrency: Record<string, number> = {};
        (v.prices || []).forEach((pr: any) => {
          if (pr.currency_code) {
            pricesByCurrency[pr.currency_code.toUpperCase()] = Number(pr.amount);
          }
        });

        const baseInr = pricesByCurrency["INR"] || 0;

        // Compute live FX suggested prices
        const suggestedUsd = fxService.calculateTargetPrice(baseInr, "USD", fxSettings);
        const suggestedAed = fxService.calculateTargetPrice(baseInr, "AED", fxSettings);
        const suggestedGbp = fxService.calculateTargetPrice(baseInr, "GBP", fxSettings);
        const suggestedEur = fxService.calculateTargetPrice(baseInr, "EUR", fxSettings);

        return {
          id: v.id,
          title: v.title,
          sku: v.sku,
          inventory_quantity: v.inventory_quantity,
          prices: {
            INR: pricesByCurrency["INR"] ?? 0,
            USD: pricesByCurrency["USD"] ?? suggestedUsd.amount,
            AED: pricesByCurrency["AED"] ?? suggestedAed.amount,
            GBP: pricesByCurrency["GBP"] ?? suggestedGbp.amount,
            EUR: pricesByCurrency["EUR"] ?? suggestedEur.amount,
          },
          savedPrices: pricesByCurrency,
          suggestedPrices: {
            USD: suggestedUsd.amount,
            AED: suggestedAed.amount,
            GBP: suggestedGbp.amount,
            EUR: suggestedEur.amount,
          },
        };
      });

      return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        thumbnail: product.thumbnail,
        variants,
      };
    });

    return NextResponse.json({
      products: items,
      count: productsRes.count,
      fxSettings,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load pricing products" },
      { status: err?.status || 500 }
    );
  }
}

