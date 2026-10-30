import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { Pool } from "pg";

let fallbackPool: Pool | null = null;
function getFallbackPool() {
  if (!fallbackPool) {
    fallbackPool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        "postgres://postgres:password@localhost:5432/medusa_ecom_buddy",
      max: 5,
    });
  }
  return fallbackPool;
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    let themeData: any = null;

    try {
      const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any;
      if (pgConnection && typeof pgConnection.raw === "function") {
        const result = await pgConnection.raw(
          "SELECT theme_data FROM theme_configurations WHERE status = 'published' ORDER BY version DESC LIMIT 1"
        );
        if (result && result.rows && result.rows.length > 0) {
          themeData = result.rows[0].theme_data;
        }
      }
    } catch {
      // If ContainerRegistrationKeys.PG_CONNECTION is not in store scope, use fallback pool
    }

    if (!themeData) {
      const pool = getFallbackPool();
      const result = await pool.query(
        "SELECT theme_data FROM theme_configurations WHERE status = 'published' ORDER BY version DESC LIMIT 1"
      );
      if (result.rows.length > 0) {
        themeData = result.rows[0].theme_data;
      }
    }

    if (!themeData) {
      return res.status(200).json({
        theme: null,
        message: "No published theme configured",
      });
    }

    // Filter to approved public attributes only
    const publicTheme = {
      version: themeData.version,
      presetId: themeData.presetId,
      presetName: themeData.presetName,
      publishedAt: themeData.publishedAt,
      identity: themeData.identity,
      typography: themeData.typography,
      colors: themeData.colors,
      styling: themeData.styling,
      announcement: themeData.announcement,
      navigation: themeData.navigation,
      heroSlider: {
        ...themeData.heroSlider,
        slides: (themeData.heroSlider?.slides || []).filter((s: any) => s.isActive),
      },
      sections: (themeData.sections || []).filter((s: any) => s.isEnabled),
      footer: themeData.footer,
      domain: themeData.domain,
    };

    return res.status(200).json({
      theme: publicTheme,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message || "Failed to load published theme",
    });
  }
};
