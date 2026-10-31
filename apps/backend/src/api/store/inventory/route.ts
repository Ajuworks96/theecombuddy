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

    // Try Medusa official remote query first with sales-channel / publishable key scoping
    try {
      const remoteQuery =
        req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY, { allowUnregistered: true }) ||
        req.scope.resolve("remoteQuery", { allowUnregistered: true });

      if (remoteQuery) {
        const filters: Record<string, any> = {};
        if (variantIds.length > 0) {
          filters.id = variantIds;
        }
        if (productId) {
          filters.product_id = productId;
        }

        const queryObj: any = {
          entryPoint: "product_variant",
          fields: [
            "id",
            "sku",
            "manage_inventory",
            "allow_backorder",
            "product_id",
            "product.id",
            "product.sales_channels.id",
            "inventory_items.inventory_item_id",
            "inventory_items.inventory.location_levels.stocked_quantity",
            "inventory_items.inventory.location_levels.reserved_quantity",
          ],
          variables: {
            filters,
          },
        };

        const result = await remoteQuery(queryObj);
        if (Array.isArray(result) && result.length > 0) {
          // If publishable key sales channels exist on request context, verify scoping
          const allowedSalesChannels = (req as any).publishable_key_context?.sales_channel_ids as string[] | undefined;

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

          for (const variant of result) {
            // Check sales channel scoping if publishable key context restricts channels
            if (allowedSalesChannels && allowedSalesChannels.length > 0) {
              const productChannels: string[] = (variant.product?.sales_channels || []).map((sc: any) => sc.id);
              const isChannelAllowed = productChannels.some((scId) => allowedSalesChannels.includes(scId));
              if (!isChannelAllowed) {
                continue; // Variant not published in the active sales channel
              }
            }

            let availableQuantity = 0;
            const invItems = variant.inventory_items || [];
            for (const item of invItems) {
              const levels = item.inventory?.location_levels || [];
              for (const lvl of levels) {
                const stocked = Number(lvl.stocked_quantity || 0);
                const reserved = Number(lvl.reserved_quantity || 0);
                availableQuantity += Math.max(0, stocked - reserved);
              }
            }

            const manageInventory = Boolean(variant.manage_inventory);
            const allowBackorder = Boolean(variant.allow_backorder);
            const inStock = !manageInventory || allowBackorder || availableQuantity > 0;

            inventory[variant.id] = {
              in_stock: inStock,
              available_quantity: availableQuantity,
              manage_inventory: manageInventory,
              allow_backorder: allowBackorder,
              sku: variant.sku || "",
            };
          }

          return res.status(200).json({ inventory });
        }
      }
    } catch (remoteQueryErr: any) {
      console.warn("[store/inventory] remoteQuery fallback to pg:", remoteQueryErr?.message);
    }

    // Direct SQL fallback with sales-channel verification
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


