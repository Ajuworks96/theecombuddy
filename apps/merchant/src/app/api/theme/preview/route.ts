import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { themeService } from "@/lib/theme-service";
import { medusaAdmin } from "@/lib/medusa-admin-client";

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") === "published" ? "published" : "draft";

  try {
    const theme = await themeService.getTheme(status);

    // Fetch real commerce data from Medusa for authentic editorial preview
    let categories: any[] = [];
    let spotlightProducts: any[] = [];

    try {
      const catData = await medusaAdmin.getCategories(session.token);
      categories = catData.product_categories || [];
    } catch (err: any) {
      console.warn("[theme-preview] Could not load categories for preview:", err.message);
    }

    try {
      const prodData = await medusaAdmin.getProducts(session.token, { limit: 6 });
      spotlightProducts = prodData.products || [];
    } catch (err: any) {
      console.warn("[theme-preview] Could not load products for preview:", err.message);
    }

    return NextResponse.json({
      theme,
      previewMeta: {
        mode: status,
        renderedAt: new Date().toISOString(),
        categoriesCount: categories.length,
        productsCount: spotlightProducts.length,
      },
      categories: categories.map((c: any) => ({
        id: c.id,
        name: c.name,
        handle: c.handle,
        description: c.description,
      })),
      products: spotlightProducts.map((p: any) => ({
        id: p.id,
        title: p.title,
        handle: p.handle,
        thumbnail: p.thumbnail,
        subtitle: p.subtitle,
        priceInr: p.variants?.[0]?.prices?.find((pr: any) => pr.currency_code === "inr")?.amount || 1999,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to generate theme preview" },
      { status: 500 }
    );
  }
}
