import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fxService, FxProvider, RoundingRule } from "@/lib/fx-service";

export async function GET(_req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await fxService.getSettings();
    return NextResponse.json({ settings });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load FX settings" },
      { status: 500 }
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

    // Markup percentage validation
    if (body.markupPercent !== undefined) {
      const markup = Number(body.markupPercent);
      if (isNaN(markup) || markup < 0 || markup > 50) {
        return NextResponse.json(
          { error: "FX markup percentage must be a valid number between 0% and 50%" },
          { status: 400 }
        );
      }
    }

    // Manual rates validation
    if (body.manualRates && typeof body.manualRates === "object") {
      for (const [curr, rate] of Object.entries(body.manualRates)) {
        const numRate = Number(rate);
        if (isNaN(numRate) || numRate <= 0) {
          return NextResponse.json(
            { error: `Invalid exchange rate for ${curr}: rate must be a positive number` },
            { status: 400 }
          );
        }
      }
    }

    const updatePayload: any = {};
    if (body.provider) updatePayload.provider = body.provider as FxProvider;
    if (body.markupPercent !== undefined) updatePayload.markupPercent = Number(body.markupPercent);
    if (body.refreshPolicy) updatePayload.refreshPolicy = body.refreshPolicy;
    if (body.roundingRules) updatePayload.roundingRules = body.roundingRules;
    if (body.manualRates) updatePayload.manualRates = body.manualRates;
    if (body.apiKey !== undefined) updatePayload.apiKey = body.apiKey;

    const saved = await fxService.saveSettings(updatePayload);

    // If live refresh was requested or provider is live
    if (body.refreshRates || body.provider === "open_er_api" || body.provider === "ecb") {
      await fxService.fetchLiveRates(saved);
    }

    const latest = await fxService.getSettings();
    return NextResponse.json({
      success: true,
      message: "FX settings and exchange rates updated successfully",
      settings: latest,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update FX settings" },
      { status: 500 }
    );
  }
}

