import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { medusaAdmin } from "@/lib/medusa-admin-client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const product = await medusaAdmin.getProduct(session.token, id);
    return NextResponse.json({ product });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || `Failed to load product ${id}` },
      { status: err?.status || 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleUpdate(req, params);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleUpdate(req, params);
}

async function handleUpdate(
  req: NextRequest,
  paramsPromise: Promise<{ id: string }>
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await paramsPromise;

  try {
    const body = await req.json();

    const updatePayload: any = {};
    if (typeof body.title === "string") updatePayload.title = body.title.trim();
    if (typeof body.description === "string") updatePayload.description = body.description;
    if (typeof body.handle === "string") updatePayload.handle = body.handle.trim();
    if (body.status === "draft" || body.status === "published") {
      updatePayload.status = body.status;
    }
    if (body.thumbnail !== undefined) updatePayload.thumbnail = body.thumbnail;
    if (body.collection_id !== undefined) updatePayload.collection_id = body.collection_id;

    if (Array.isArray(body.images)) {
      updatePayload.images = body.images.map((img: any) => ({
        url: typeof img === "string" ? img : img.url,
      }));
    }

    if (Array.isArray(body.category_ids)) {
      updatePayload.categories = body.category_ids.map((cid: string) => ({ id: cid }));
    } else if (Array.isArray(body.categories)) {
      updatePayload.categories = body.categories.map((c: any) => ({
        id: typeof c === "string" ? c : c.id,
      }));
    }

    const updatedProduct = await medusaAdmin.updateProduct(
      session.token,
      id,
      updatePayload
    );

    // Handle variant updates if supplied
    if (Array.isArray(body.variants)) {
      for (const variant of body.variants) {
        const variantPayload: any = {};
        if (variant.title) variantPayload.title = variant.title;
        if (variant.sku) variantPayload.sku = variant.sku;
        if (variant.options) variantPayload.options = variant.options;
        if (Array.isArray(variant.prices)) {
          variantPayload.prices = variant.prices.map((p: any) => ({
            currency_code: p.currency_code.toLowerCase(),
            amount: Math.round(Number(p.amount) || 0),
          }));
        }

        if (variant.id) {
          try {
            await medusaAdmin.updateVariant(session.token, id, variant.id, variantPayload);
          } catch (varErr) {
            console.warn(`Could not update variant ${variant.id}:`, varErr);
          }
        } else if (variant.title && variant.sku) {
          try {
            await medusaAdmin.createVariant(session.token, id, variantPayload);
          } catch (varErr) {
            console.warn("Could not create variant:", varErr);
          }
        }
      }
    }

    // Return latest hydrated product state
    const finalProduct = await medusaAdmin.getProduct(session.token, id);
    return NextResponse.json({ product: finalProduct });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || `Failed to update product ${id}` },
      { status: err?.status || 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await medusaAdmin.deleteProduct(session.token, id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || `Failed to delete product ${id}` },
      { status: err?.status || 500 }
    );
  }
}
