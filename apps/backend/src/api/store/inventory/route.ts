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
    const productId = req.query.product_id as string | undefined;
    const variantIdsParam = req.query.variant_ids as string | undefined;
    const variantId = req.query.variant_id as string | undefined;

    let variantIds: string[] = [];
    if (variantIdsParam) {
      variantIds = variantIdsParam.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (variantId) {
      variantIds = [variantId.trim()];
    }

    if (!productId && variantIds.length === 0) {
      return res.status(400).json({
        error: "Either product_id or variant_id/variant_ids query parameter is required",
      });
    }

    const pool = getFallbackPool();

    let queryText = "";
    let params: any[] = [];

    if (productId && variantIds.length > 0) {
      queryText = `
        SELECT 
          pv.id AS variant_id,
          pv.product_id,
          pv.sku,
          pv.allow_backorder,
          pv.manage_inventory,
          COALESCE(SUM(il.stocked_quantity - il.reserved_quantity), 0)::int AS available_quantity
        FROM product_variant pv
        LEFT JOIN product_variant_inventory_item pvii ON pvii.variant_id = pv.id
        LEFT JOIN inventory_level il ON il.inventory_item_id = pvii.inventory_item_id
        WHERE (pv.product_id = $1 OR pv.id = ANY($2::text[]))
          AND pv.deleted_at IS NULL
        GROUP BY pv.id, pv.product_id, pv.sku, pv.allow_backorder, pv.manage_inventory
      `;
      params = [productId, variantIds];
    } else if (productId) {
      queryText = `
        SELECT 
          pv.id AS variant_id,
          pv.product_id,
          pv.sku,
          pv.allow_backorder,
          pv.manage_inventory,
          COALESCE(SUM(il.stocked_quantity - il.reserved_quantity), 0)::int AS available_quantity
        FROM product_variant pv
        LEFT JOIN product_variant_inventory_item pvii ON pvii.variant_id = pv.id
        LEFT JOIN inventory_level il ON il.inventory_item_id = pvii.inventory_item_id
        WHERE pv.product_id = $1
          AND pv.deleted_at IS NULL
        GROUP BY pv.id, pv.product_id, pv.sku, pv.allow_backorder, pv.manage_inventory
      `;
      params = [productId];
    } else {
      queryText = `
        SELECT 
          pv.id AS variant_id,
          pv.product_id,
          pv.sku,
          pv.allow_backorder,
          pv.manage_inventory,
          COALESCE(SUM(il.stocked_quantity - il.reserved_quantity), 0)::int AS available_quantity
        FROM product_variant pv
        LEFT JOIN product_variant_inventory_item pvii ON pvii.variant_id = pv.id
        LEFT JOIN inventory_level il ON il.inventory_item_id = pvii.inventory_item_id
        WHERE pv.id = ANY($1::text[])
          AND pv.deleted_at IS NULL
        GROUP BY pv.id, pv.product_id, pv.sku, pv.allow_backorder, pv.manage_inventory
      `;
      params = [variantIds];
    }

    const result = await pool.query(queryText, params);

    const inventory: Record<
      string,
      {
        in_stock: boolean;
        available_quantity: number;
        manage_inventory: boolean;
        allow_backorder: boolean;
        sku: string;
      }
    > = {};

    for (const row of result.rows) {
      const inStock =
        !row.manage_inventory ||
        row.allow_backorder === true ||
        row.available_quantity > 0;

      inventory[row.variant_id] = {
        in_stock: inStock,
        available_quantity: row.available_quantity,
        manage_inventory: row.manage_inventory,
        allow_backorder: row.allow_backorder,
        sku: row.sku,
      };
    }

    return res.status(200).json({ inventory });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message || "Failed to query variant inventory",
    });
  }
};
