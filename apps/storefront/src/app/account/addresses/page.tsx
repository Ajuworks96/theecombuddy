import { Metadata } from "next";
import { getPublishedTheme, getStoreRegions } from "../../../lib/medusa-client";
import { DEFAULT_STOREFRONT_THEME } from "../../../lib/default-theme";
import { AddressesClient } from "../../../components/AddressesClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const theme = (await getPublishedTheme()) || DEFAULT_STOREFRONT_THEME;
  const storeName = theme.identity?.storeName || "The Ecom Buddy";
  return {
    title: `Saved Addresses | ${storeName}`,
    description: `Manage your delivery destinations and billing addresses at ${storeName}.`,
  };
}

export default async function AddressesPage() {
  const [themeRes, regions] = await Promise.all([
    getPublishedTheme(),
    getStoreRegions(),
  ]);

  const theme = themeRes || DEFAULT_STOREFRONT_THEME;
  const initialRegion = regions[0];

  return (
    <AddressesClient
      theme={theme}
      regions={regions}
      initialRegion={initialRegion}
    />
  );
}

