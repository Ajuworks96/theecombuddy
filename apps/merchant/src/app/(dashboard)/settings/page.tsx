import React from "react";
import { merchantConfig } from "@/config/merchant.config";
import {
  SettingsIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  LockIcon,
  GlobeIcon,
  PackageIcon,
} from "@/components/icons";

export default function SettingsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Platform & White-Label Configuration
        </h2>
        <p className="text-xs text-slate-500">
          Installation-specific identity, backend connections, and gateway safety parameters.
        </p>
      </div>

      {/* Section 1: White-Label Identity */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <SettingsIcon size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              White-Label Merchant Identity
            </h3>
            <p className="text-xs text-slate-500">
              Configured via environment abstraction (Zero multi-tenant sharing)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              Business Name
            </span>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {merchantConfig.name}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Tagline: {merchantConfig.tagline}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              Brand Acronym & Display Code
            </span>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {merchantConfig.shortName}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Support: {merchantConfig.supportEmail}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              Localization & Base Currency
            </span>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {merchantConfig.localization.currencySymbol}{" "}
              {merchantConfig.localization.defaultCurrency} ({merchantConfig.localization.defaultLocale})
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Timezone: {merchantConfig.localization.timezone}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              Supported International Currencies
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {merchantConfig.localization.supportedCurrencies.map((c) => (
                <span
                  key={c}
                  className="px-2 py-0.5 bg-white border border-slate-200 text-slate-800 rounded font-mono font-semibold text-[11px]"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Self-Hosted Architecture & Licensing */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircleIcon size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              License & Deployment Model
            </h3>
            <p className="text-xs text-slate-500">
              Self-hosted independence (No external SaaS phone-home)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">
              License Tier
            </span>
            <div className="font-bold text-slate-900 mt-1">
              {merchantConfig.license.tier}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">
              Edition
            </span>
            <div className="font-bold text-slate-900 mt-1">
              {merchantConfig.license.edition}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">
              Software Version
            </span>
            <div className="font-bold text-slate-900 mt-1">
              v{merchantConfig.license.version} (Medusa 2.22.1)
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Payment Safety & Gateway Blockers (Phase 9) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
            <LockIcon size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Payment Gateway Security & Guardrails
            </h3>
            <p className="text-xs text-slate-500">
              Zero-mock safety policy active across all checkout pipelines
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
          <div className="font-bold flex items-center gap-1.5 text-amber-950">
            <AlertTriangleIcon size={16} className="text-amber-600" />
            <span>Razorpay Live Payments: Guarded & Inactive</span>
          </div>
          <p className="leading-relaxed">
            Per company policy, live gateway charges remain blocked until the client provides verified live merchant credentials and confirms webhook signing secrets on their production domain.
          </p>
          <div className="pt-2 text-[11px] font-mono text-amber-800">
            Current Status: Provider registered (pp_razorpay_razorpay) · Cash on Delivery enabled in India only · International regions COD-free.
          </div>
        </div>
      </div>
    </div>
  );
}

