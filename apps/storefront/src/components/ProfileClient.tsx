"use client";

import React, { useState, useEffect } from "react";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import { type StoreRegion } from "@the-ecom-buddy/ui";
import { AccountLayout } from "./AccountLayout";
import { useCustomer } from "../context/CustomerContext";

interface ProfileClientProps {
  theme: PublicPublishedTheme;
  regions: StoreRegion[];
  initialRegion?: StoreRegion;
}

export const ProfileClient: React.FC<ProfileClientProps> = ({
  theme,
  regions,
  initialRegion,
}) => {
  const { customer, isAuthenticated, isLoading, refresh } = useCustomer();

  // Profile Form Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Password Form Fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ success: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login?redirect=/account/profile";
      return;
    }

    if (customer) {
      setFirstName(customer.first_name || "");
      setLastName(customer.last_name || "");
      setPhone(customer.phone || "");
    }
  }, [customer, isLoading, isAuthenticated]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setIsSavingProfile(true);

    try {
      const res = await fetch("/api/auth/customer/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setProfileMessage({ success: true, text: "Profile details updated successfully." });
        await refresh();
      } else {
        setProfileMessage({ success: false, text: data.error || "Failed to update profile." });
      }
    } catch {
      setProfileMessage({ success: false, text: "Failed to update profile. Please try again." });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordMessage({ success: false, text: "Password must be at least 8 characters long." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ success: false, text: "Passwords do not match." });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/auth/customer/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setPasswordMessage({ success: true, text: "Password updated successfully." });
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordMessage({ success: false, text: data.error || "Failed to change password." });
      }
    } catch {
      setPasswordMessage({ success: false, text: "Failed to change password. Please try again." });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading || !customer) {
    return (
      <AccountLayout theme={theme} regions={regions} initialRegion={initialRegion} activeTab="profile">
        <div className="py-20 text-center">
          <svg className="w-8 h-8 mx-auto animate-spin text-[var(--brand-primary)] mb-2" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-xs text-[var(--text-muted)]">Loading profile...</p>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout
      theme={theme}
      regions={regions}
      initialRegion={initialRegion}
      activeTab="profile"
      title="Profile & Security"
      subtitle="Update personal contact information, update account password, and manage security settings."
    >
      <div className="space-y-8">
        {/* Personal Details Card */}
        <div className="p-6 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
          <div className="pb-3 border-b border-[var(--border-subtle)] mb-5">
            <h2 className="text-base font-bold">Personal Information</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              These contact details are used to pre-fill your checkout and order confirmation communications.
            </p>
          </div>

          {profileMessage && (
            <div className={`p-3 mb-5 rounded-[var(--theme-radius)] text-xs flex items-center gap-2 ${
              profileMessage.success
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              <span>{profileMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Email Address <span className="text-[10px] text-[var(--text-muted)]">(Account Primary)</span>
                </label>
                <input
                  type="email"
                  disabled
                  value={customer.email}
                  className="w-full px-3.5 py-2.5 rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-muted)] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91..."
                  className="w-full px-3.5 py-2.5 rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-5 py-2.5 rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
              >
                {isSavingProfile ? "Saving Details..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="p-6 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
          <div className="pb-3 border-b border-[var(--border-subtle)] mb-5">
            <h2 className="text-base font-bold">Account Security & Password</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Ensure your account is using a strong password of at least 8 characters.
            </p>
          </div>

          {passwordMessage && (
            <div className={`p-3 mb-5 rounded-[var(--theme-radius)] text-xs flex items-center gap-2 ${
              passwordMessage.success
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              <span>{passwordMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs max-w-lg">
            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">New Password (min 8 characters)</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)]"
              />
            </div>

            <div className="pt-2 flex justify-start">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="px-5 py-2.5 rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
              >
                {isChangingPassword ? "Updating Password..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>

        {/* Account Metadata Audit */}
        <div className="p-4 rounded-[var(--theme-radius)] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] flex flex-wrap items-center justify-between gap-2">
          <span>Customer Identity: <code className="font-mono">{customer.id}</code></span>
          <span>Member Since: {new Date(customer.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span>
        </div>
      </div>
    </AccountLayout>
  );
};

