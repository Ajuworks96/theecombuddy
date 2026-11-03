import { Metadata } from "next";
import { getPublishedTheme, getStoreRegions } from "../../lib/medusa-client";
import { DEFAULT_STOREFRONT_THEME } from "../../lib/default-theme";
import { ContactClient } from "../../components/ContactClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const theme = (await getPublishedTheme()) || DEFAULT_STOREFRONT_THEME;
  const storeName = theme.identity?.storeName || "The Ecom Buddy";
  return {
    title: `Contact Us | ${storeName}`,
    description: `Get in touch with customer support at ${storeName} for order status, product inquiries, and custom requests.`,
  };
}

export default async function ContactPage() {
  const [themeRes, regions] = await Promise.all([
    getPublishedTheme(),
    getStoreRegions(),
  ]);

  const theme = themeRes || DEFAULT_STOREFRONT_THEME;
  const initialRegion = regions[0];

  return (
    <ContactClient
      theme={theme}
      regions={regions}
      initialRegion={initialRegion}
    />
  );
}
