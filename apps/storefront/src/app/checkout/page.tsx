import { Metadata } from "next";
import { getPublishedTheme, getStoreRegions } from "../../lib/medusa-client";
import { DEFAULT_STOREFRONT_THEME } from "../../lib/default-theme";
import { CheckoutClient } from "../../components/CheckoutClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const theme = (await getPublishedTheme()) || DEFAULT_STOREFRONT_THEME;
  const storeName = theme.identity?.storeName || "The Ecom Buddy";
  return {
    title: `Express Checkout | ${storeName}`,
    description: `Secure guest checkout for your order at ${storeName}. Direct single-merchant fulfillment.`,
  };
}

export default async function CheckoutPage() {
  const [themeRes, regions] = await Promise.all([
    getPublishedTheme(),
    getStoreRegions(),
  ]);

  const theme = themeRes || DEFAULT_STOREFRONT_THEME;
  const initialRegion = regions[0];

  return (
    <CheckoutClient
      theme={theme}
      regions={regions}
      initialRegion={initialRegion}
    />
  );
}
