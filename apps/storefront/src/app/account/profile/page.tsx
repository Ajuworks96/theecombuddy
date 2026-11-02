import { Metadata } from "next";
import { getPublishedTheme, getStoreRegions } from "../../../lib/medusa-client";
import { DEFAULT_STOREFRONT_THEME } from "../../../lib/default-theme";
import { ProfileClient } from "../../../components/ProfileClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const theme = (await getPublishedTheme()) || DEFAULT_STOREFRONT_THEME;
  const storeName = theme.identity?.storeName || "The Ecom Buddy";
  return {
    title: `Profile & Security | ${storeName}`,
    description: `Update personal contact details and password security at ${storeName}.`,
  };
}

export default async function ProfilePage() {
  const [themeRes, regions] = await Promise.all([
    getPublishedTheme(),
    getStoreRegions(),
  ]);

  const theme = themeRes || DEFAULT_STOREFRONT_THEME;
  const initialRegion = regions[0];

  return (
    <ProfileClient
      theme={theme}
      regions={regions}
      initialRegion={initialRegion}
    />
  );
}

