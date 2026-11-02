"use client";

import React, { useState } from "react";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import { ThemeRoot, Header, Footer, CartDrawer, type StoreRegion } from "@the-ecom-buddy/ui";
import { useCustomer } from "../context/CustomerContext";
import { useCart } from "../context/CartContext";

interface RegisterClientProps {
  theme: PublicPublishedTheme;
  regions: StoreRegion[];
  initialRegion?: StoreRegion;
}

export const RegisterClient: React.FC<RegisterClientProps> = ({
  theme,
  regions,
  initialRegion,
}) => {
  const [currentRegion, setCurrentRegion] = useState<StoreRegion | undefined>(
    initialRegion || regions[0]
  );

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register } = useCustomer();
  const { cart, itemCount, isCartDrawerOpen, openCartDrawer, closeCartDrawer } = useCart();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setIsSubmitting(true);
    const result = await register({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      phone,
    });
    setIsSubmitting(false);

    if (result.success) {
      window.location.href = "/account";
    } else {
      setErrorMessage(result.error || "Failed to create account");
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
          <div className="w-full max-w-lg">
            <div className="bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-[var(--theme-radius)] p-6 sm:p-8 shadow-sm">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Create Customer Account</h1>
                <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                  Save your shipping addresses, track active shipments, and manage past orders.
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

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jane"
                      className="w-full px-3.5 py-2.5 text-sm rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full px-3.5 py-2.5 text-sm rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Email Address <span className="text-red-500">*</span>
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
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 text-sm rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Password (min 8 chars) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 text-sm rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 text-sm rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-4 py-3 px-4 rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] text-center">
                <p className="text-xs text-[var(--text-secondary)]">
                  Already have an account?{" "}
                  <a href="/login" className="font-semibold text-[var(--brand-primary)] hover:underline">
                    Sign in here
                  </a>
                </p>
              </div>
            </div>
          </div>
        </main>

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
