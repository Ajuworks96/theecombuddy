import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getPublishedTheme, getStoreRegions } from "../../../../lib/medusa-client";
import { DEFAULT_STOREFRONT_THEME } from "../../../../lib/default-theme";
import { OrderConfirmationClient } from "../../../../components/OrderConfirmationClient";
import { verifyGuestOrderToken } from "../../../../lib/guest-order-token";

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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: orderId } = await params;

  if (!orderId) {
    notFound();
  }

  const [themeRes, regions, cookieStore] = await Promise.all([
    getPublishedTheme(),
    getStoreRegions(),
    cookies(),
  ]);

  const theme = themeRes || DEFAULT_STOREFRONT_THEME;

  // Check if secure guest order token cookie is present
  const cookieName = `teb_guest_order_${orderId}`;
  const tokenCookie = cookieStore.get(cookieName)?.value;

  let initialOrder: any = null;
  if (tokenCookie) {
    const verification = verifyGuestOrderToken(tokenCookie, orderId);
    if (verification.valid) {
      try {
        const backendUrl =
          process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
          process.env.MEDUSA_BACKEND_URL ||
          "http://localhost:9000";
        const pk =
          process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
          process.env.MEDUSA_PUBLISHABLE_KEY ||
          "pk_cfee22fd52344d6a2f23778c3b1614b8e659a22bb4a58feb399864fde668e996";

        const res = await fetch(
          `${backendUrl}/store/orders/${encodeURIComponent(orderId)}?fields=*items,*shipping_address,*billing_address,*shipping_methods,*payment_collections,*payment_collections.payments`,
          {
            headers: {
              "Content-Type": "application/json",
              "x-publishable-api-key": pk,
              "x-guest-order-token": tokenCookie,
            },
            cache: "no-store",
          }
        );
        if (res.ok) {
          const json = await res.json();
          initialOrder = json.order || null;
        }
      } catch (e) {
        console.warn("[OrderConfirmationPage] Preload error:", e);
      }
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
