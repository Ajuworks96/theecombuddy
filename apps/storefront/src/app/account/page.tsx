import { Metadata } from "next";
import { getPublishedTheme, getStoreRegions } from "../../lib/medusa-client";
import { DEFAULT_STOREFRONT_THEME } from "../../lib/default-theme";
import { AccountDashboardClient } from "../../components/AccountDashboardClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const theme = (await getPublishedTheme()) || DEFAULT_STOREFRONT_THEME;
  const storeName = theme.identity?.storeName || "The Ecom Buddy";
  return {
    title: `My Account | ${storeName}`,
    description: `Manage your orders, shipment tracking, and saved delivery addresses at ${storeName}.`,
  };
}

export default async function AccountPage() {
  const [themeRes, regions] = await Promise.all([
    getPublishedTheme(),
    getStoreRegions(),
  ]);

  const theme = themeRes || DEFAULT_STOREFRONT_THEME;
  const initialRegion = regions[0];

  return (
    <AccountDashboardClient
      theme={theme}
      regions={regions}
      initialRegion={initialRegion}
    />
  );
}

