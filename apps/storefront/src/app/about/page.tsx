import { Metadata } from "next";
import { getPublishedTheme, getStoreRegions } from "../../lib/medusa-client";
import { DEFAULT_STOREFRONT_THEME } from "../../lib/default-theme";
import { getStorePolicy } from "../../lib/policies";
import { PolicyPageLayout } from "../../components/PolicyPageLayout";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const theme = (await getPublishedTheme()) || DEFAULT_STOREFRONT_THEME;
  const storeName = theme.identity?.storeName || "The Ecom Buddy";
  return {
    title: `About Us | ${storeName}`,
    description: `Learn more about our heritage, craft, and mission at ${storeName}.`,
  };
}

export default async function AboutPage() {
  const [themeRes, regions, policy] = await Promise.all([
    getPublishedTheme(),
    getStoreRegions(),
    getStorePolicy("about"),
  ]);

  const theme = themeRes || DEFAULT_STOREFRONT_THEME;
  const initialRegion = regions[0];

  return (
    <PolicyPageLayout
      theme={theme}
      regions={regions}
      initialRegion={initialRegion}
      title={policy.title}
      content={policy.content}
      updatedAt={policy.updated_at}
    />
  );
}
