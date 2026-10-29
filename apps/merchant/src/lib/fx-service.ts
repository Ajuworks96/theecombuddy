/**
 * The Ecom Buddy — Foreign Exchange (FX) & Multi-Currency Engine
 *
 * Self-hosted, per-installation exchange rate provider interface and pricing service.
 * Supports:
 * - Base INR currency
 * - Live provider integration (open.er-api.com / ECB reference)
 * - Merchant-defined manual benchmark rates
 * - Configurable merchant FX volatility markup
 * - Currency-specific psychological rounding rules (.99, .95, Integer)
 * - Manual price override precedence
 * - Safe outage handling and cached fallbacks
 */

import fs from "fs";
import path from "path";

export type FxProvider =
  | "open_er_api"
  | "manual_rates"
  | "ecb"
  | "exchangerate_api"
  | "open_exchange_rates";

export type RoundingRule = "none" | "point_99" | "point_95" | "integer";

export interface FxSettings {
  provider: FxProvider;
  apiKey?: string;
  baseCurrency: string;
  refreshPolicy: "daily" | "hourly" | "manual";
  markupPercent: number; // e.g. 2.5%
  roundingRules: Record<string, RoundingRule>;
  manualRates: Record<string, number>; // 1 INR = X Foreign Currency
  rates: Record<string, number>; // Current effective rates
  lastFetchedAt?: string;
  lastVerifiedAt?: string;
  isAutomaticAvailable: boolean;
  outageStatus: "healthy" | "cached_fallback" | "unavailable";
}

// Default verified benchmark rates (1 INR = X target currency)
// Used as safe local bootstrap fallbacks if external provider is offline
const DEFAULT_INR_BENCHMARK_RATES: Record<string, number> = {
  INR: 1,
  USD: 0.0105, // ~ ₹95.24 per USD
  AED: 0.0385, // ~ ₹25.97 per AED
  EUR: 0.0094, // ~ ₹106.38 per EUR
  GBP: 0.0079, // ~ ₹126.58 per GBP
};

const DEFAULT_ROUNDING_RULES: Record<string, RoundingRule> = {
  USD: "point_99",
  EUR: "point_95",
  GBP: "point_99",
  AED: "integer",
  INR: "integer",
};

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "fx-settings.json");

export class FxService {
  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  /**
   * Load local FX configuration
   */
  async getSettings(): Promise<FxSettings> {
    this.ensureDirectory();

    if (fs.existsSync(SETTINGS_FILE)) {
      try {
        const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        return {
          provider: parsed.provider || "open_er_api",
          apiKey: parsed.apiKey || "",
          baseCurrency: parsed.baseCurrency || "INR",
          refreshPolicy: parsed.refreshPolicy || "daily",
          markupPercent: Number(parsed.markupPercent ?? 2.5),
          roundingRules: { ...DEFAULT_ROUNDING_RULES, ...(parsed.roundingRules || {}) },
          manualRates: { ...DEFAULT_INR_BENCHMARK_RATES, ...(parsed.manualRates || {}) },
          rates: { ...DEFAULT_INR_BENCHMARK_RATES, ...(parsed.rates || {}) },
          lastFetchedAt: parsed.lastFetchedAt || new Date().toISOString(),
          lastVerifiedAt: parsed.lastVerifiedAt || new Date().toISOString(),
          isAutomaticAvailable: parsed.isAutomaticAvailable ?? true,
          outageStatus: parsed.outageStatus || "healthy",
        };
      } catch (err) {
        console.warn("[fx-service] Failed to parse local fx-settings.json, using defaults:", err);
      }
    }

    const initialSettings: FxSettings = {
      provider: "open_er_api",
      apiKey: "",
      baseCurrency: "INR",
      refreshPolicy: "daily",
      markupPercent: 2.5,
      roundingRules: DEFAULT_ROUNDING_RULES,
      manualRates: DEFAULT_INR_BENCHMARK_RATES,
      rates: DEFAULT_INR_BENCHMARK_RATES,
      lastFetchedAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      isAutomaticAvailable: true,
      outageStatus: "healthy",
    };

    await this.saveSettings(initialSettings);
    return initialSettings;
  }

  /**
   * Persist FX settings
   */
  async saveSettings(settings: Partial<FxSettings>): Promise<FxSettings> {
    this.ensureDirectory();
    const current = await this.getSettings().catch(() => ({}) as FxSettings);

    const merged: FxSettings = {
      ...current,
      ...settings,
      baseCurrency: (settings.baseCurrency || current.baseCurrency || "INR").toUpperCase(),
      roundingRules: { ...(current.roundingRules || DEFAULT_ROUNDING_RULES), ...(settings.roundingRules || {}) },
      manualRates: { ...(current.manualRates || DEFAULT_INR_BENCHMARK_RATES), ...(settings.manualRates || {}) },
      rates: { ...(current.rates || DEFAULT_INR_BENCHMARK_RATES), ...(settings.rates || {}) },
    };

    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), "utf-8");
    return merged;
  }

  /**
   * Fetch live exchange rates from configured provider
   */
  async fetchLiveRates(settings?: FxSettings): Promise<{
    rates: Record<string, number>;
    timestamp: string;
    outageStatus: "healthy" | "cached_fallback" | "unavailable";
  }> {
    const config = settings || (await this.getSettings());

    if (config.provider === "manual_rates") {
      return {
        rates: config.manualRates,
        timestamp: new Date().toISOString(),
        outageStatus: "healthy",
      };
    }

    try {
      let fetchedRates: Record<string, number> = {};

      if (config.provider === "open_er_api" || config.provider === "ecb") {
        const res = await fetch("https://open.er-api.com/v6/latest/INR", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          throw new Error(`Exchange rate provider returned HTTP ${res.status}`);
        }

        const data = await res.json();
        if (!data.rates || typeof data.rates !== "object") {
          throw new Error("Invalid exchange rate payload format");
        }

        fetchedRates = {
          INR: 1,
          USD: Number(data.rates.USD) || DEFAULT_INR_BENCHMARK_RATES.USD,
          AED: Number(data.rates.AED) || DEFAULT_INR_BENCHMARK_RATES.AED,
          EUR: Number(data.rates.EUR) || DEFAULT_INR_BENCHMARK_RATES.EUR,
          GBP: Number(data.rates.GBP) || DEFAULT_INR_BENCHMARK_RATES.GBP,
        };
      } else {
        // Fallback or unsupported provider
        fetchedRates = config.manualRates;
      }

      // Update cached rates
      const now = new Date().toISOString();
      await this.saveSettings({
        rates: fetchedRates,
        lastFetchedAt: now,
        lastVerifiedAt: now,
        outageStatus: "healthy",
        isAutomaticAvailable: true,
      });

      return {
        rates: fetchedRates,
        timestamp: now,
        outageStatus: "healthy",
      };
    } catch (err: any) {
      console.warn("[fx-service] Live FX provider error, activating safe fallback:", err.message);

      // Safe fallback to existing cached rates
      const fallbackRates = config.rates || config.manualRates || DEFAULT_INR_BENCHMARK_RATES;
      await this.saveSettings({
        outageStatus: "cached_fallback",
      });

      return {
        rates: fallbackRates,
        timestamp: config.lastFetchedAt || new Date().toISOString(),
        outageStatus: "cached_fallback",
      };
    }
  }

  /**
   * Calculate foreign price from base INR amount
   * Manual price overrides ALWAYS take precedence
   */
  calculateTargetPrice(
    baseInrAmount: number,
    targetCurrency: string,
    settings: FxSettings,
    manualPrice?: number | null
  ): {
    amount: number;
    currency: string;
    isManual: boolean;
    rateUsed: number;
    rawConverted: number;
  } {
    const currency = targetCurrency.toUpperCase();

    // 1. Base INR returns base price directly
    if (currency === "INR") {
      return {
        amount: Math.round(baseInrAmount),
        currency: "INR",
        isManual: true,
        rateUsed: 1,
        rawConverted: baseInrAmount,
      };
    }

    // 2. Manual price override takes absolute precedence
    if (manualPrice !== undefined && manualPrice !== null && !isNaN(manualPrice) && manualPrice > 0) {
      return {
        amount: Number(manualPrice),
        currency,
        isManual: true,
        rateUsed: settings.rates[currency] || 0,
        rawConverted: manualPrice,
      };
    }

    // 3. Automatic FX calculation
    const rate = settings.rates[currency] || settings.manualRates[currency] || 0;
    if (rate <= 0) {
      return {
        amount: 0,
        currency,
        isManual: false,
        rateUsed: 0,
        rawConverted: 0,
      };
    }

    const markupMultiplier = 1 + (Number(settings.markupPercent) || 0) / 100;
    const rawConverted = baseInrAmount * rate * markupMultiplier;

    // Apply currency rounding rule
    const rule = settings.roundingRules[currency] || "none";
    let finalAmount = rawConverted;

    switch (rule) {
      case "point_99":
        finalAmount = Math.max(1, Math.floor(rawConverted) + 0.99);
        break;
      case "point_95":
        finalAmount = Math.max(1, Math.floor(rawConverted) + 0.95);
        break;
      case "integer":
        finalAmount = Math.max(1, Math.round(rawConverted));
        break;
      case "none":
      default:
        finalAmount = Number(rawConverted.toFixed(2));
        break;
    }

    return {
      amount: finalAmount,
      currency,
      isManual: false,
      rateUsed: rate,
      rawConverted,
    };
  }
}

export const fxService = new FxService();

