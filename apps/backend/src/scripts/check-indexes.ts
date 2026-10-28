import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function checkIndexes({ container }: { container: MedusaContainer }) {
  const query = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
  const pgConnection = container.resolve(ContainerRegistrationKeys.PG_CONNECTION);

  const res = await pgConnection.raw(`
    SELECT tablename, indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename IN ('product', 'product_variant', 'inventory_item', 'inventory_level', 'product_variant_inventory_item')
    ORDER BY tablename, indexname;
  `);

  console.log("Database Indexes on Core Catalog & Inventory Tables:");
  for (const row of res.rows) {
    console.log(` - [${row.tablename}] ${row.indexname}`);
  }
}
