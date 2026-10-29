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
    const region = await medusaAdmin.getRegion(session.token, id);
    if (!region) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    return NextResponse.json({ market: region });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || `Failed to load market ${id}` },
      { status: err?.status || 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleMarketUpdate(req, params);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleMarketUpdate(req, params);
}

async function handleMarketUpdate(
  req: NextRequest,
  paramsPromise: Promise<{ id: string }>
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await paramsPromise;

  try {
    const existing = await medusaAdmin.getRegion(session.token, id);
    if (!existing) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    const body = await req.json();
    const payload: any = {};

    if (body.name && typeof body.name === "string") {
      payload.name = body.name.trim();
    }

    if (Array.isArray(body.countries)) {
      payload.countries = body.countries.map((c: string) => c.toLowerCase());
    }

    // Handle Activation toggle with readiness enforcement
    if (body.is_active !== undefined) {
      const activating = Boolean(body.is_active);

      if (activating) {
        // Enforce readiness criteria before allowing activation
        const currency = (existing.currency_code || "").toLowerCase();
        const supported = ["inr", "usd", "aed", "gbp", "eur"].includes(currency);
        if (!supported) {
          return NextResponse.json(
            { error: `Cannot activate market: Currency ${currency.toUpperCase()} is not in supported list.` },
            { status: 400 }
          );
        }

        const providers = existing.payment_providers || [];
        if (providers.length === 0) {
          return NextResponse.json(
            { error: "Cannot activate market: No payment provider connected to this region." },
            { status: 400 }
          );
        }

        // COD safety check: COD cannot be active on international markets
        const hasCod = providers.some((p: any) => p.id?.includes("system") || p.id?.includes("cod"));
        if (currency !== "inr" && hasCod) {
          return NextResponse.json(
            { error: "Cannot activate market: COD payment provider cannot be enabled for international destinations." },
            { status: 400 }
          );
        }
      }

      payload.metadata = {
        ...(existing.metadata || {}),
        is_active: activating,
      };
    }

    const updated = await medusaAdmin.updateRegion(session.token, id, payload);
    return NextResponse.json({
      success: true,
      message: `Market ${updated.name} updated successfully`,
      market: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || `Failed to update market ${id}` },
      { status: err?.status || 500 }
    );
  }
}

