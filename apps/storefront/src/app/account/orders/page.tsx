import { Metadata } from "next";
import { getPublishedTheme, getStoreRegions } from "../../../lib/medusa-client";
import { DEFAULT_STOREFRONT_THEME } from "../../../lib/default-theme";
import { OrdersListClient } from "../../../components/OrdersListClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const theme = (await getPublishedTheme()) || DEFAULT_STOREFRONT_THEME;
  const storeName = theme.identity?.storeName || "The Ecom Buddy";
  return {
    title: `Order History | ${storeName}`,
    description: `View all past purchases, invoices, and shipment tracking at ${storeName}.`,
  };
}

export default async function OrdersPage() {
  const [themeRes, regions] = await Promise.all([
    getPublishedTheme(),
    getStoreRegions(),
  ]);

  const theme = themeRes || DEFAULT_STOREFRONT_THEME;
  const initialRegion = regions[0];

  return (
    <OrdersListClient
      theme={theme}
      regions={regions}
      initialRegion={initialRegion}
    />
  );
}

