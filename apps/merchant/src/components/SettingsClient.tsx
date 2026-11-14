"use client";

import React, { useState, useEffect } from "react";
import {
  SettingsIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  LockIcon,
  GlobeIcon,
  CreditCardIcon,
  RefreshCwIcon,
  UsersIcon,
} from "@/components/icons";

export interface SettingsClientProps {
  initialConfig: any;
}

export function SettingsClient({ initialConfig }: SettingsClientProps) {
  const [gatewaysData, setGatewaysData] = useState<any[]>([]);
  const [reconciliation, setReconciliation] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const [reconcileMessage, setReconcileMessage] = useState<string | null>(null);
  const [licenseData, setLicenseData] = useState<any>(null);
  const [newLicenseInput, setNewLicenseInput] = useState("");
  const [licenseSaving, setLicenseSaving] = useState(false);
  const [licenseMessage, setLicenseMessage] = useState<string | null>(null);

  const fetchLicenseData = async () => {
    try {
      const res = await fetch("/api/settings/license");
      if (res.ok) {
        const data = await res.json();
        setLicenseData(data);
      }
    } catch {
      // offline fallback
    }
  };

  const fetchPaymentData = async () => {
    try {
      const [resPay, resEvents] = await Promise.all([
        fetch("/api/settings/payments").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/settings/payments/reconcile?limit=10").then((r) => (r.ok ? r.json() : null)),
      ]);

      if (resPay) {
        setGatewaysData(resPay.gateways || []);
        setReconciliation(resPay.reconciliation || null);
      }
      if (resEvents) {
        setEvents(resEvents.events || []);
      }
    } catch (err) {
      console.error("Failed to load payment settings data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentData();
    fetchLicenseData();
  }, []);

  const handleInstallLicense = async () => {
    if (!newLicenseInput.trim()) return;
    setLicenseSaving(true);
    setLicenseMessage(null);
    try {
      const res = await fetch("/api/settings/license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: newLicenseInput,
      });
      const data = await res.json();
      if (res.ok) {
        setLicenseMessage("License verified and installed successfully!");
        setNewLicenseInput("");
        await fetchLicenseData();
      } else {
        setLicenseMessage(`Error: ${data.message}`);
      }
    } catch (err: any) {
      setLicenseMessage(`Upload failed: ${err.message}`);
    } finally {
      setLicenseSaving(false);
    }
  };

  const handleReconcile = async (eventId: string) => {
    setReconcilingId(eventId);
    setReconcileMessage(null);
    try {
      const res = await fetch("/api/settings/payments/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId }),
      });
      const data = await res.json();
      if (res.ok) {
        setReconcileMessage(data.message || "Event reconciled successfully.");
        await fetchPaymentData();
      } else {
        setReconcileMessage(`Reconciliation failed: ${data.error}`);
      }
    } catch (err: any) {
      setReconcileMessage(`Error: ${err.message}`);
    } finally {
      setReconcilingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "live_verified":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Live Verified
          </span>
        );
      case "sandbox_verified":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            Test Mode Active
          </span>
        );
      case "sandbox_configured":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            Test Mode Configured
          </span>
        );
      case "not_configured":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            Not Configured
          </span>
        );
      case "disabled":
      case "failed_verification":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            Disabled / Blocked
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Platform &amp; White-Label Configuration
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
              {initialConfig.name}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Tagline: {initialConfig.tagline}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              Brand Acronym &amp; Display Code
            </span>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {initialConfig.shortName}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Support: {initialConfig.supportEmail}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              Localization &amp; Base Currency
            </span>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {initialConfig.localization.currencySymbol}{" "}
              {initialConfig.localization.defaultCurrency} ({initialConfig.localization.defaultLocale})
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Timezone: {initialConfig.localization.timezone}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              Supported International Currencies
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {initialConfig.localization.supportedCurrencies.map((c: string) => (
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
              License &amp; Deployment Model
            </h3>
            <p className="text-xs text-slate-500">
              Self-hosted independence (No external SaaS phone-home or central lockouts)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">
              License Tier
            </span>
            <div className="font-bold text-slate-900 mt-1">
              {initialConfig.license.tier}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">
              License Status
            </span>
            <div className="font-bold text-emerald-600 flex items-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Active &amp; Perpetual</span>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">
              Edition
            </span>
            <div className="font-bold text-slate-900 mt-1">
              {initialConfig.license.edition}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">
              Software Version
            </span>
            <div className="font-bold text-slate-900 mt-1">
              v{initialConfig.license.version} (Medusa 2.22.1)
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Payment Gateways & Verification Guardrails */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <CreditCardIcon size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Payment Gateways &amp; Guardrails
              </h3>
              <p className="text-xs text-slate-500">
                Strict fail-closed policy: Unverified live gateways remain blocked until verified.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchPaymentData}
            className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-lg"
            title="Refresh payment statuses"
          >
            <RefreshCwIcon size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Gateways Matrix */}
        <div className="space-y-3">
          {gatewaysData.map((gw) => (
            <div
              key={gw.id}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{gw.name}</span>
                  {getStatusBadge(gw.status)}
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                    {gw.environment}
                  </span>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed max-w-xl">
                  {gw.notes}
                </p>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1 font-mono">
                  <span>Provider ID: {gw.provider_id}</span>
                  {gw.key_id_masked && <span>Key: {gw.key_id_masked}</span>}
                  <span>Currencies: {gw.supported_currencies.join(", ")}</span>
                </div>
              </div>

              <div className="sm:text-right flex-shrink-0">
                {gw.is_enabled ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                    <CheckCircleIcon size={14} /> Available at Checkout
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-[11px]">
                    <LockIcon size={14} /> Guarded (Setup Required)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Webhook Reconciliation & Event Inbox */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <RefreshCwIcon size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Payment Webhook Reconciliation Inbox
              </h3>
              <p className="text-xs text-slate-500">
                Durable PostgreSQL event persistence ensuring zero lost payment callbacks.
              </p>
            </div>
          </div>
          {reconciliation && (
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                Total: {reconciliation.total_inbox}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold">
                Completed: {reconciliation.completed}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold">
                Pending: {reconciliation.pending}
              </span>
              {reconciliation.failed > 0 && (
                <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 font-bold">
                  Failed: {reconciliation.failed}
                </span>
              )}
            </div>
          )}
        </div>

        {reconcileMessage && (
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono">
            {reconcileMessage}
          </div>
        )}

        {events.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            No incoming gateway webhook events recorded in this session. All payment events are durably indexed upon arrival.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5 rounded-l-lg">Event ID</th>
                  <th className="p-2.5">Provider</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Received At</th>
                  <th className="p-2.5 text-right rounded-r-lg">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/50">
                    <td className="p-2.5 font-mono text-[11px] text-slate-800">{evt.event_id}</td>
                    <td className="p-2.5 font-semibold text-slate-700 capitalize">{evt.provider_id}</td>
                    <td className="p-2.5 font-mono text-[11px] text-slate-600">{evt.event_type}</td>
                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          evt.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : evt.status === "failed"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {evt.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-400 text-[11px]">
                      {new Date(evt.received_at).toLocaleTimeString()}
                    </td>
                    <td className="p-2.5 text-right">
                      {evt.status !== "completed" && (
                        <button
                          type="button"
                          disabled={reconcilingId === evt.event_id}
                          onClick={() => handleReconcile(evt.event_id)}
                          className="px-2.5 py-1 bg-slate-900 text-white rounded text-[10px] font-semibold hover:bg-slate-800 disabled:opacity-50"
                        >
                          {reconcilingId === evt.event_id ? "Reconciling..." : "Reconcile"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 5: Offline Perpetual License Verification */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircleIcon size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Offline Perpetual Single-Merchant License
              </h3>
              <p className="text-xs text-slate-500">
                100% autonomous operation with zero phone-home DRM or SaaS dependencies.
              </p>
            </div>
          </div>
          {licenseData?.verification?.valid ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Licensed: Perpetual
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              Evaluation Mode
            </span>
          )}
        </div>

        {licenseData?.verification && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-semibold">Licensee:</span>
              <span className="text-slate-900 font-bold">
                {licenseData.verification.licensee || "Evaluation / Unregistered Store"}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-semibold">Status Notice:</span>
              <span className="text-emerald-700 font-medium">
                {licenseData.verification.message}
              </span>
            </div>
            {licenseData.verification.permitted_domains && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-slate-500 font-semibold">Permitted Domains:</span>
                <span className="font-mono text-slate-800 text-[11px]">
                  {licenseData.verification.permitted_domains.join(", ")}
                </span>
              </div>
            )}
            {licenseData.verification.issue_date && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-slate-500 font-semibold">Issue Date:</span>
                <span className="text-slate-700">{licenseData.verification.issue_date}</span>
              </div>
            )}
          </div>
        )}

        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Install or Update Offline License Key (JSON)
          </label>
          <textarea
            value={newLicenseInput}
            onChange={(e) => setNewLicenseInput(e.target.value)}
            placeholder='Paste your signed license.json content here {"license_id": "...", "signature": "..."}'
            rows={3}
            className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              Verified locally via asymmetric RSA-SHA256. Zero external network calls.
            </p>
            <button
              type="button"
              disabled={licenseSaving || !newLicenseInput.trim()}
              onClick={handleInstallLicense}
              className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500 disabled:opacity-50"
            >
              {licenseSaving ? "Verifying..." : "Verify & Save License"}
            </button>
          </div>
          {licenseMessage && (
            <p className="mt-2 text-xs font-medium text-slate-700">{licenseMessage}</p>
          )}
        </div>
      </div>

      {/* Section 6: Staff Authorization & Role-Based Access Control */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
            <UsersIcon size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Staff Authorization &amp; RBAC Roles
            </h3>
            <p className="text-xs text-slate-500">
              Granular permission boundaries enforcing operational safety on backend mutations.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Store Owner</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                Superadmin
              </span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Full control over financial settings, payment credentials, theme publishing, database maintenance, and staff accounts.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Store Manager</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                Management
              </span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Product catalog editing, promotion management, customer communications, refund authorization, and review of analytics.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Operations Staff</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold">
                Fulfillment
              </span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Order processing, warehouse fulfillment, COD collection confirmation, inventory counts, and courier tracking updates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
