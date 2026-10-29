import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { medusaAdmin } from "@/lib/medusa-admin-client";

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const q = searchParams.get("q") || undefined;
  const status = searchParams.get("status") || undefined;
  const order = searchParams.get("order") || undefined;

  try {
    const data = await medusaAdmin.getProducts(session.token, {
      limit,
      offset,
      q,
      status,
      order,
    });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load catalog products" },
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

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Product title is required" },
        { status: 400 }
      );
    }

    const title = body.title.trim();
    const handle =
      body.handle && typeof body.handle === "string" && body.handle.trim()
        ? body.handle
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
        : title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

    // Format options & variants
    const options = Array.isArray(body.options) ? body.options : [];
    let variants = Array.isArray(body.variants) ? body.variants : [];

    if (variants.length === 0) {
      variants = [
        {
          title: "Default",
          sku: body.sku || `${handle.toUpperCase()}-DEF`,
          prices: body.prices || [{ currency_code: "inr", amount: 0 }],
          options: options.length > 0 ? { [options[0].title]: options[0].values[0] } : { Default: "Default" },
        },
      ];
    } else {
      // Validate SKUs
      for (const v of variants) {
        if (!v.sku || typeof v.sku !== "string" || !v.sku.trim()) {
          v.sku = `${handle.toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        }
      }
    }

    // Format categories
    let categories: Array<{ id: string }> | undefined = undefined;
    if (Array.isArray(body.category_ids) && body.category_ids.length > 0) {
      categories = body.category_ids.map((id: string) => ({ id }));
    } else if (Array.isArray(body.categories) && body.categories.length > 0) {
      categories = body.categories.map((c: any) => ({
        id: typeof c === "string" ? c : c.id,
      }));
    }

    // Format images
    let images: Array<{ url: string }> | undefined = undefined;
    if (Array.isArray(body.images)) {
      images = body.images.map((img: any) => ({
        url: typeof img === "string" ? img : img.url,
      }));
    }

    const payload: any = {
      title,
      description: body.description || "",
      handle,
      status: body.status === "published" ? "published" : "draft",
      thumbnail: body.thumbnail || (images && images.length > 0 ? images[0].url : null),
      collection_id: body.collection_id || null,
      options: options.length > 0 ? options : [{ title: "Default", values: ["Default"] }],
      variants: variants.map((v: any) => ({
        title: v.title || "Default",
        sku: v.sku.trim(),
        options: v.options || (options.length > 0 ? { [options[0].title]: options[0].values[0] } : { Default: "Default" }),
        prices: (v.prices || [{ currency_code: "inr", amount: 0 }]).map((p: any) => ({
          currency_code: p.currency_code.toLowerCase(),
          amount: Math.round(Number(p.amount) || 0),
        })),
      })),
    };

    if (categories && categories.length > 0) {
      payload.categories = categories;
    }
    if (images && images.length > 0) {
      payload.images = images;
    }

    const product = await medusaAdmin.createProduct(session.token, payload);
    return NextResponse.json({ product }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create product" },
      { status: err?.status || 500 }
    );
  }
}
