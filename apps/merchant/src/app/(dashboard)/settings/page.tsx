import React from "react";
import { merchantConfig } from "@/config/merchant.config";
import { SettingsClient } from "@/components/SettingsClient";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return <SettingsClient initialConfig={merchantConfig} />;
}
