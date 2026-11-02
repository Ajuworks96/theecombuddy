"use client";

import React, { useState } from "react";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import { ThemeRoot, Header, Footer, CartDrawer, type StoreRegion } from "@the-ecom-buddy/ui";
import { useCustomer } from "../context/CustomerContext";
import { useCart } from "../context/CartContext";

interface LoginClientProps {
  theme: PublicPublishedTheme;
  regions: StoreRegion[];
  initialRegion?: StoreRegion;
}

export const LoginClient: React.FC<LoginClientProps> = ({
  theme,
  regions,
  initialRegion,
}) => {
  const [currentRegion, setCurrentRegion] = useState<StoreRegion | undefined>(
    initialRegion || regions[0]
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  const { login } = useCustomer();
  const { cart, itemCount, isCartDrawerOpen, openCartDrawer, closeCartDrawer } = useCart();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage("Please enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get("redirect") || "/account";
      window.location.href = redirect;
    } else {
      setErrorMessage(result.error || "Invalid email or password");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    setIsForgotLoading(true);
    setForgotStatus(null);
    try {
      const res = await fetch("/api/auth/customer/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      setForgotStatus(data.message || "Password reset instructions sent.");
    } catch {
      setForgotStatus("Failed to send reset instructions. Please try again.");
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <ThemeRoot theme={theme}>
      <div className="min-h-screen flex flex-col bg-[var(--surface-base)] text-[var(--text-primary)]">
        <Header
          theme={theme}
          regions={regions}
          currentRegion={currentRegion}
          cartItemCount={itemCount}
          onOpenCartDrawer={openCartDrawer}
          onSelectRegion={(r) => setCurrentRegion(r)}
        />

        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
          <div className="w-full max-w-md">
            {/* Card Container */}
            <div className="bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-[var(--theme-radius)] p-6 sm:p-8 shadow-sm">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Customer Sign In</h1>
                <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                  Access your order history, tracking details, and saved addresses.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-6 p-3 rounded-[var(--theme-radius)] bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 text-sm rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setShowForgotModal(true);
                      }}
                      className="text-[11px] text-[var(--brand-primary)] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 text-sm rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 px-4 rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] text-center">
                <p className="text-xs text-[var(--text-secondary)]">
                  Don&apos;t have an account?{" "}
                  <a href="/register" className="font-semibold text-[var(--brand-primary)] hover:underline">
                    Create one now
                  </a>
                </p>

                <div className="mt-4 pt-4 border-t border-dashed border-[var(--border-subtle)]">
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Checked out as a guest?{" "}
                    <a href="/order/confirmation/order_01M636Y5E2YWT6KJRG49KF8107" className="font-semibold text-[var(--text-secondary)] hover:text-[var(--brand-primary)]">
                      Look up guest order
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Forgot Password Modal */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-[var(--theme-radius)] p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-base font-bold mb-1">Reset Password</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                Enter your email address and we&apos;ll send you instructions to reset your password.
              </p>

              {forgotStatus ? (
                <div className="p-3 mb-4 rounded-[var(--theme-radius)] bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  {forgotStatus}
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3 py-2 text-xs rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="flex-1 py-2 text-xs font-semibold rounded-[var(--theme-radius)] border border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isForgotLoading}
                      className="flex-1 py-2 text-xs font-semibold rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {isForgotLoading ? "Sending..." : "Send Reset"}
                    </button>
                  </div>
                </form>
              )}

              {forgotStatus && (
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full mt-2 py-2 text-xs font-semibold rounded-[var(--theme-radius)] border border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)]"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        )}

        <Footer theme={theme} />
        <CartDrawer
          theme={theme}
          isOpen={isCartDrawerOpen}
          onClose={closeCartDrawer}
          cart={cart}
          onUpdateQuantity={() => Promise.resolve()}
          onRemoveItem={() => Promise.resolve()}
        />
      </div>
    </ThemeRoot>
  );
};
