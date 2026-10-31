import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedTheme, getStoreRegions, getStoreOrder } from "../../../../lib/medusa-client";
import { DEFAULT_STOREFRONT_THEME } from "../../../../lib/default-theme";
import { OrderConfirmationClient } from "../../../../components/OrderConfirmationClient";

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
    title: `Order Confirmation | ${storeName}`,
    description: `Confirmed details and fulfillment schedule for order ${id} at ${storeName}.`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { id: orderId } = await params;
  const { email } = await searchParams;

  if (!orderId) {
    notFound();
  }

  const [themeRes, regions] = await Promise.all([
    getPublishedTheme(),
    getStoreRegions(),
  ]);

  const theme = themeRes || DEFAULT_STOREFRONT_THEME;

  // If email is passed in searchParams, verify and preload on server
  let initialOrder: any = null;
  if (email) {
    const fetched = await getStoreOrder(orderId);
    if (fetched && fetched.email?.toLowerCase() === email.toLowerCase().trim()) {
      initialOrder = fetched;
    }
  }

  return (
    <OrderConfirmationClient
      theme={theme}
      orderId={orderId}
      regions={regions}
      initialOrder={initialOrder}
    />
  );
}
