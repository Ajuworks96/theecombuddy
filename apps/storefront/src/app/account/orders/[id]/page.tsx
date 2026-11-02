import { Metadata } from "next";
import { getPublishedTheme, getStoreRegions } from "../../../../lib/medusa-client";
import { DEFAULT_STOREFRONT_THEME } from "../../../../lib/default-theme";
import { OrderDetailClient } from "../../../../components/OrderDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const theme = (await getPublishedTheme()) || DEFAULT_STOREFRONT_THEME;
  const storeName = theme.identity?.storeName || "The Ecom Buddy";
  return {
    title: `Order Details & Tracking | ${storeName}`,
    description: `Track shipment and view order summary for #${id.slice(-8)} at ${storeName}.`,
  };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, themeRes, regions] = await Promise.all([
    params,
    getPublishedTheme(),
    getStoreRegions(),
  ]);

  const theme = themeRes || DEFAULT_STOREFRONT_THEME;
  const initialRegion = regions[0];

  return (
    <OrderDetailClient
      orderId={id}
      theme={theme}
      regions={regions}
      initialRegion={initialRegion}
    />
  );
}

