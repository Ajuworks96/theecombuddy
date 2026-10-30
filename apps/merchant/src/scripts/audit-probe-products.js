const { Client } = require("pg");

const DB_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:password@localhost:5432/medusa_ecom_buddy";

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  // Find all products
  const res = await client.query(`
    SELECT id, title, handle, status, deleted_at, created_at, updated_at
    FROM product
    ORDER BY created_at ASC
  `);

  const allProducts = res.rows;
  console.log(`Total products in database: ${allProducts.length}`);

  // Base seed products follow 'teb-[category-code]-[001..065]'
  const seeded = allProducts.filter((p) =>
    /^teb-[a-z]{4}-\d{3}$/.test(p.handle)
  );
  const extra = allProducts.filter(
    (p) => !/^teb-[a-z]{4}-\d{3}$/.test(p.handle)
  );

  console.log(`Seeded baseline products : ${seeded.length} (Expected 520)`);
  const activeSeeded = seeded.filter(p => !p.deleted_at);
  const deletedSeeded = seeded.filter(p => p.deleted_at);
  console.log(`Active seeded products     : ${activeSeeded.length}`);
  console.log(`Deleted seeded products    : ${deletedSeeded.length}`);
  console.log(`Extra / non-seed products  : ${extra.length}\n`);

  const activeExtra = extra.filter(p => !p.deleted_at);
  const softDeletedExtra = extra.filter(p => p.deleted_at);
  console.log(`Active extra products      : ${activeExtra.length}`);
  console.log(`Soft-deleted extra products: ${softDeletedExtra.length}\n`);

  // Check table names in public schema
  const tablesRes = await client.query(`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
  `);
  const tables = new Set(tablesRes.rows.map((r) => r.table_name));

  const report = [];

  for (const p of extra) {
    // 1. Variants
    const vRes = await client.query(
      `SELECT id, title, sku FROM product_variant WHERE product_id = $1`,
      [p.id]
    );
    const variants = vRes.rows;
    const variantIds = variants.map((v) => v.id);
    const skus = variants.map((v) => v.sku);

    // 2. Order line items (check if any customer order references this product)
    let orderLineItemsCount = 0;
    if (tables.has("order_line_item") && variantIds.length > 0) {
      const oliRes = await client.query(
        `SELECT count(*) FROM order_line_item WHERE variant_id = ANY($1::text[])`,
        [variantIds]
      );
      orderLineItemsCount = parseInt(oliRes.rows[0].count, 10);
    }

    // 3. Inventory item associations
    let inventoryLinksCount = 0;
    if (
      tables.has("product_variant_inventory_item") &&
      variantIds.length > 0
    ) {
      const invRes = await client.query(
        `SELECT count(*) FROM product_variant_inventory_item WHERE variant_id = ANY($1::text[])`,
        [variantIds]
      );
      inventoryLinksCount = parseInt(invRes.rows[0].count, 10);
    }

    // 4. Cart line items
    let cartLineItemsCount = 0;
    if (tables.has("cart_line_item") && variantIds.length > 0) {
      const cliRes = await client.query(
        `SELECT count(*) FROM cart_line_item WHERE variant_id = ANY($1::text[])`,
        [variantIds]
      );
      cartLineItemsCount = parseInt(cliRes.rows[0].count, 10);
    }

    // Evidence
    const isProbeHandle =
      p.handle.includes("probe") ||
      p.handle.includes("test") ||
      p.handle.includes("lifecycle") ||
      p.title.includes("Probe") ||
      p.title.includes("Test") ||
      p.title.includes("Handcrafted Artisan Ceramic Teapot");

    const hasDependencies =
      orderLineItemsCount > 0 || cartLineItemsCount > 0;

    report.push({
      id: p.id,
      title: p.title,
      handle: p.handle,
      status: p.status,
      createdAt: p.created_at,
      variantsCount: variants.length,
      skus,
      orderLineItemsCount,
      inventoryLinksCount,
      cartLineItemsCount,
      isDisposable: isProbeHandle && !hasDependencies,
      blocker: hasDependencies
        ? "Has active order/cart line item dependencies"
        : !isProbeHandle
        ? "Not conclusively identifiable as test probe"
        : null,
    });
  }

  console.log(JSON.stringify(report, null, 2));

  const disposable = report.filter((r) => r.isDisposable);
  const preserved = report.filter((r) => !r.isDisposable);

  console.log(`\n--- DRY-RUN SUMMARY ---`);
  console.log(`Disposable test products: ${disposable.length}`);
  console.log(`Preserved extra products: ${preserved.length}`);

  await client.end();
}

main().catch(console.error);
