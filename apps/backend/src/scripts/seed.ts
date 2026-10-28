import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createCollectionsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/core-flows";

interface CategoryDef {
  name: string;
  handle: string;
  code: string;
  titles: string[];
  options: { title: string; values: string[] };
  priceRange: [number, number];
}

const CATEGORIES: CategoryDef[] = [
  {
    name: "Electronics & Audio",
    handle: "electronics-audio",
    code: "ELEC",
    titles: [
      "True Wireless Active Noise Cancelling Earbuds",
      "Fast GaN Wall Charger 65W with Type-C",
      "Braided Fast-Charging USB-C Cable 2m",
      "Portable Waterproof Bluetooth Speaker 20W",
      "Ergonomic Aluminium Laptop Cooling Stand",
      "Smart Fitness Tracker with AMOLED Display",
      "Wireless MagSafe Charging Power Bank 10000mAh",
      "Smart Wi-Fi Power Strip with Energy Monitoring",
      "Studio Monitor Over-Ear Headphones",
      "Ultra-Slim Mechanical Wireless Keyboard",
      "Precision Optical Wireless Ergonomic Mouse",
      "4K HDMI Braided High-Speed Display Cable",
      "USB-C Multiport Hub with 4K HDMI & SD Card",
      "Noise-Isolating In-Ear Gaming Earphones",
      "Compact Magnetic Car Phone Mount Charger",
    ],
    options: { title: "Color", values: ["Matte Black", "Arctic White", "Gunmetal Grey"] },
    priceRange: [799, 14999],
  },
  {
    name: "Apparel & Ethnic Wear",
    handle: "apparel-ethnic-wear",
    code: "APPR",
    titles: [
      "Handloom Khadi Pure Cotton Kurta",
      "Classic Linen Casual Spread-Collar Shirt",
      "Tussar Silk Embroidered Festive Nehru Jacket",
      "Tailored Slim-Fit Chino Trousers",
      "Heavyweight Organic Cotton Relaxed T-Shirt",
      "Pure Mulberry Silk Festive Bandhani Saree",
      "Breathable Stretch Athleisure Joggers",
      "Block-Printed Indigo Handloom Dupatta",
      "Premium Combed Cotton Crew-Neck Sweatshirt",
      "Everyday Comfort Cotton Boxer Shorts Set",
      "Woven Ikat Casual Mandarin Collar Shirt",
      "Chanderi Silk Lightweight Festive Kurti",
      "Water-Resistant All-Weather Windbreaker Jacket",
      "French Terry Athletic Training Shorts",
      "Traditional Cotton Dhoti with Golden Zari",
    ],
    options: { title: "Size", values: ["S", "M", "L", "XL"] },
    priceRange: [599, 8999],
  },
  {
    name: "Home & Kitchen Living",
    handle: "home-kitchen-living",
    code: "HOME",
    titles: [
      "Handcrafted Pure Copper Water Dispenser 5L",
      "Pre-Seasoned Heavy Duty Cast Iron Skillet 26cm",
      "Artisanal Ceramic Matte Stoneware Dinner Set",
      "Natural Sheesham Wood End-Grain Cutting Board",
      "Ultrasonic Essential Oil Aromatherapy Diffuser",
      "Organic Bamboo Cotton Bathroom Towel Set",
      "Handwoven Jute & Cotton Floor Area Rug",
      "Double-Walled Insulated Stainless Steel Flask",
      "Handmade Brass Pooja Diya Lamp Pair",
      "Airtight Borosilicate Glass Spice Jar Organizer",
      "Woven Macrame Indoor Plant Hanging Basket",
      "100% Organic Linen Hand-Stitched Table Runner",
      "Ergonomic Memory Foam Cervical Sleeping Pillow",
      "Bespoke Hammered Copper Moscow Mule Mugs",
      "Reusable Beeswax Food Storage Wraps Set",
    ],
    options: { title: "Variant", values: ["Standard Edition", "Premium Set"] },
    priceRange: [499, 9999],
  },
  {
    name: "Health & Ayurvedic Wellness",
    handle: "health-ayurvedic-wellness",
    code: "WELL",
    titles: [
      "Pure Kashmiri Mongra Saffron Grade-A1",
      "Organic Ashwagandha KSM-66 Root Extract Powder",
      "Cold-Pressed Virgin Extra Coconut Oil 1L",
      "Raw Forest Wildflower Multifloral Honey",
      "Certified Organic Triphala Digestive Capsules",
      "Wild Forest Pure Shilajit Resin Gold Grade",
      "Organic Moringa Oleifera Superfood Green Powder",
      "Amla & Tulsi Vitamin C Immunity Booster Fizz",
      "Pure Ayurvedic Brahmi Memory Enhancer Tablets",
      "Unrefined Extra Virgin Wood-Pressed Sesame Oil",
      "Herbal Vapourizer Ayurvedic Inhaler Essential",
      "Chyawanprash with 40+ Rare Himalayan Herbs",
      "Pure Kumkumadi Tailam Miraculous Beauty Fluid",
      "Herbal Sleep Wellness Chamomile & Tagar Tea",
      "Ayurvedic Copper Tongue Cleaner Twin Pack",
    ],
    options: { title: "Pack Size", values: ["Pack of 1", "Pack of 2 (Value)"] },
    priceRange: [349, 4499],
  },
  {
    name: "Books & Artisanal Stationery",
    handle: "books-stationery",
    code: "BOOK",
    titles: [
      "Handcrafted Full-Grain Buffalo Leather Journal",
      "Machined Solid Brass Fountain Pen Fine Nib",
      "Traditional Indian Miniature Art Hardcover Book",
      "100% Recycled Cotton Rag Deckle-Edge Paper Pack",
      "Artisan Woodblock Print Bookmark Collection",
      "Minimalist Undated Productivity Daily Planner",
      "Professional Calligraphy Wooden Dip Pen Set",
      "Sustainable Bamboo Desk Organizer Pen Stand",
      "Archival Ink Fine Fineliner Drawing Pens Set",
      "Wax Seal Stamp Kit with Metallic Wax Beads",
      "Handmade Watercolour Sketchbook 300 GSM Cold Pressed",
      "Bespoke Monogrammed Wax Seal Stamp Initial",
      "Indian Textile Heritage Illustrated Volume",
      "Solid Brass Metric Architect Drafting Ruler",
      "Vintage Antique Paper Envelope Stationery Set",
    ],
    options: { title: "Edition", values: ["Collector Edition", "Studio Edition"] },
    priceRange: [299, 3999],
  },
  {
    name: "Gourmet & Organic Foods",
    handle: "gourmet-organic-foods",
    code: "FOOD",
    titles: [
      "Single-Origin Coorg Arabica Roasted Coffee Beans",
      "First Flush Darjeeling Orthodox Loose Leaf Tea",
      "Vedic Bilona A2 Gir Cow Desi Cultured Ghee 500ml",
      "Roasted Himalayan Pink Salt Crunchy Makhana",
      "Stone-Ground All-Natural Crunchy Peanut Butter",
      "Artisanal 72% Single-Origin Idukki Dark Chocolate",
      "Tellicherry Garbled Special Extra Bold Black Pepper",
      "Natural Himalayan Pink Crystal Rock Salt Grinder",
      "Pure Kashmiri Walnut Kernels Vacuum Packed",
      "Organic Sun-Dried Royal Golden Raisins",
      "Hand-Pounded Red Rice from Wayanad Rainforest",
      "Spicy Andhra Avakaya Mango Pickle in Mustard Oil",
      "Organic Golden Flax Seeds Cold Ground Ready",
      "Artisanal Sourdough Whole Wheat Crisp Crackers",
      "Raw Unpasteurized Apple Cider Vinegar with Mother",
    ],
    options: { title: "Weight", values: ["250g", "500g"] },
    priceRange: [249, 2999],
  },
  {
    name: "Sports & Fitness Gear",
    handle: "sports-fitness",
    code: "SPRT",
    titles: [
      "Natural Tree Rubber Non-Slip Yoga Mat 6mm",
      "Stainless Steel Insulated Protein Shaker 750ml",
      "Heavy-Duty Adjustable Hand Grip Strengthener",
      "Natural Latex Fabric Loop Resistance Bands 5-Pack",
      "High-Density Foam Roller for Deep Tissue Recovery",
      "Speed Jump Rope with Ball Bearings & Steel Cable",
      "Lightweight Trail Running Hydration Vest 5L",
      "Graphite High-Tension Badminton Racket with Cover",
      "Microfiber Quick-Dry Ultra-Absorbent Gym Towel",
      "Breathable Padded Weightlifting Training Gloves",
      "Adjustable Neoprene Knee Support Compression Sleeve",
      "Ergonomic Push-Up Bars with Non-Slip Grip",
      "Reflective Night Running Armband Phone Holder",
      "Targeted Trigger Point Massage Lacrosse Ball",
      "Sports Water Bottle 1L with Time Marker Scale",
    ],
    options: { title: "Variant", values: ["Standard", "Pro Athlete"] },
    priceRange: [399, 4999],
  },
  {
    name: "Clean Beauty & Personal Care",
    handle: "beauty-personal-care",
    code: "BEAU",
    titles: [
      "Kumkumadi Rejuvenating Night Face Serum 30ml",
      "Sandalwood & Saffron Skin Polishing Ubtan Scrub",
      "Broad Spectrum Mineral Zinc Sunscreen SPF 50+",
      "Sulfate-Free Hibiscus & Bhringraj Scalp Shampoo",
      "Activated Bamboo Charcoal Deep Cleansing Body Wash",
      "Steam-Distilled Kannauj Rose Water Facial Mist",
      "Raw Organic Nilotica Shea Butter Lip Moisturizer",
      "Cold-Pressed Organic Moroccan Argan Hair Elixir",
      "Handcrafted Neem Wood Detangling Comb Set",
      "Pure French Green Clay Clarifying Detox Face Mask",
      "Almond & Vitamin E Nourishing Under-Eye Cream",
      "Natural Deodorant Stick with Bergamot & Lime",
      "Volcanic Lava Stone Foot Exfoliating Buffer",
      "Organic Vetiver Root Natural Bathing Loofah",
      "Deep Hydrating Hyaluronic Acid & Niacinamide Serum",
    ],
    options: { title: "Size", values: ["50ml", "100ml"] },
    priceRange: [299, 3499],
  },
];

const COLLECTIONS = [
  { title: "Bestsellers", handle: "bestsellers" },
  { title: "Festive Specials", handle: "festive-specials" },
  { title: "New Arrivals", handle: "new-arrivals" },
  { title: "Eco-Conscious Living", handle: "eco-conscious-living" },
];

export default async function seedDatabase({ container }: { container: MedusaContainer }) {
  const query = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
  const productModule = container.resolve(Modules.PRODUCT);
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL);
  const inventoryModule = container.resolve(Modules.INVENTORY);

  console.log("==============================================================================");
  console.log("[seed] The Ecom Buddy — Production Seed Generator (Milestone 02B)");
  console.log("==============================================================================");

  // 1. Verify Sales Channel
  let [defaultSalesChannel] = await salesChannelModule.listSalesChannels({ name: "Default Sales Channel" });
  if (!defaultSalesChannel) {
    [defaultSalesChannel] = await salesChannelModule.createSalesChannels([{ name: "Default Sales Channel" }]);
    console.log(`[seed] Created Default Sales Channel: ${defaultSalesChannel.id}`);
  } else {
    console.log(`[seed] Found Default Sales Channel: ${defaultSalesChannel.id}`);
  }

  // 2. Verify India Region
  const regionQuery = await query({
    entryPoint: "region",
    fields: ["id", "name", "currency_code"],
    variables: { filters: { currency_code: "inr" } },
  });
  let indiaRegion = regionQuery[0];
  if (!indiaRegion) {
    const { result: regions } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "India",
            currency_code: "inr",
            countries: ["in"],
          },
        ],
      },
    });
    indiaRegion = regions[0];
    console.log(`[seed] Created India Region: ${indiaRegion.id}`);
  } else {
    console.log(`[seed] Found India Region: ${indiaRegion.id}`);
  }

  // 3. Verify Stock Location & Link to Sales Channel
  const locQuery = await query({
    entryPoint: "stock_location",
    fields: ["id", "name"],
    variables: { filters: { name: "India Central Warehouse" } },
  });
  let stockLocation = locQuery[0];
  if (!stockLocation) {
    const { result: locations } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "India Central Warehouse",
            address: {
              address_1: "Bandra Kurla Complex",
              city: "Mumbai",
              country_code: "in",
              postal_code: "400051",
            },
          },
        ],
      },
    });
    stockLocation = locations[0];
    console.log(`[seed] Created Stock Location: ${stockLocation.id}`);

    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: {
        id: stockLocation.id,
        add: [defaultSalesChannel.id],
      },
    });
    console.log("[seed] Linked Sales Channel to Stock Location.");
  } else {
    console.log(`[seed] Found Stock Location: ${stockLocation.id}`);
  }

  // 4. Idempotency Check: Existing Products Count
  const existingProducts = await query({
    entryPoint: "product",
    fields: ["id", "handle"],
  });
  console.log(`[seed] Current product catalog size: ${existingProducts.length} products`);

  if (existingProducts.length >= 500) {
    console.log("[seed] Catalog already contains >= 500 products. Skipping product creation to ensure idempotency.");
    console.log("==============================================================================");
    return;
  }

  // 5. Create or verify Categories
  console.log("[seed] Initializing Categories & Collections...");
  const categoryMap = new Map<string, string>();
  for (const cat of CATEGORIES) {
    const [existing] = await productModule.listProductCategories({ handle: cat.handle });
    if (existing) {
      categoryMap.set(cat.handle, existing.id);
    } else {
      const [created] = await productModule.createProductCategories([
        {
          name: cat.name,
          handle: cat.handle,
        },
      ]);
      categoryMap.set(cat.handle, created.id);
    }
  }

  // 6. Create or verify Collections
  const collectionMap = new Map<string, string>();
  for (const col of COLLECTIONS) {
    const existingCols = await query({
      entryPoint: "product_collection",
      fields: ["id", "handle"],
      variables: { filters: { handle: col.handle } },
    });
    if (existingCols.length > 0) {
      collectionMap.set(col.handle, existingCols[0].id);
    } else {
      const { result: createdCols } = await createCollectionsWorkflow(container).run({
        input: {
          collections: [
            {
              title: col.title,
              handle: col.handle,
            },
          ],
        },
      });
      collectionMap.set(col.handle, createdCols[0].id);
    }
  }

  // 7. Generate 520 Distinct Products (65 per category * 8 categories)
  const collectionHandles = COLLECTIONS.map((c) => c.handle);
  const productsToCreate: any[] = [];
  const existingHandles = new Set(existingProducts.map((p: any) => p.handle));

  const TARGET_PER_CAT = 65; // 8 * 65 = 520 distinct products
  let globalCount = 0;

  for (const cat of CATEGORIES) {
    const categoryId = categoryMap.get(cat.handle)!;

    for (let i = 1; i <= TARGET_PER_CAT; i++) {
      globalCount++;
      const baseTitle = cat.titles[(i - 1) % cat.titles.length];
      const cycle = Math.floor((i - 1) / cat.titles.length) + 1;
      const title = cycle === 1 ? baseTitle : `${baseTitle} (Series ${cycle} Edition)`;
      const handle = `teb-${cat.code.toLowerCase()}-${String(i).padStart(3, "0")}`;

      if (existingHandles.has(handle)) {
        continue;
      }

      // Assign collection deterministically
      const colHandle = collectionHandles[i % collectionHandles.length];
      const collectionId = collectionMap.get(colHandle);

      // Status: 90% published, 10% draft
      const isDraft = i % 10 === 0;
      const status = isDraft ? "draft" : "published";

      // Options & Variants
      const optionValues = cat.options.values;
      const basePrice = Math.floor(
        cat.priceRange[0] + ((cat.priceRange[1] - cat.priceRange[0]) * (i / TARGET_PER_CAT))
      );

      const variants = optionValues.map((val, vIdx) => {
        const variantSku = `TEB-${cat.code}-${String(i).padStart(3, "0")}-V${vIdx + 1}`;
        const priceMultiplier = 1 + vIdx * 0.25;
        const variantPrice = Math.round(basePrice * priceMultiplier);

        return {
          title: val,
          sku: variantSku,
          options: { [cat.options.title]: val },
          manage_inventory: true,
          prices: [
            {
              currency_code: "inr",
              amount: variantPrice,
            },
          ],
        };
      });

      productsToCreate.push({
        title,
        subtitle: `Authentic ${cat.name} demonstration item`,
        description: `Premium quality ${title} sourced and curated for The Ecom Buddy white-label commerce platform. Ideal for Indian retail fulfillment.`,
        handle,
        status,
        collection_id: collectionId,
        category_ids: [categoryId],
        sales_channels: [{ id: defaultSalesChannel.id }],
        thumbnail: `https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80`,
        options: [
          {
            title: cat.options.title,
            values: optionValues,
          },
        ],
        variants,
      });
    }
  }

  console.log(`[seed] Prepared ${productsToCreate.length} distinct products to create across 8 categories.`);

  // 8. Execute Batch Product Creation
  const BATCH_SIZE = 25;
  const createdVariantsWithStock: Array<{ inventory_item_id: string; quantity: number }> = [];

  for (let b = 0; b < productsToCreate.length; b += BATCH_SIZE) {
    const chunk = productsToCreate.slice(b, b + BATCH_SIZE);
    const chunkNumber = Math.floor(b / BATCH_SIZE) + 1;
    const totalChunks = Math.ceil(productsToCreate.length / BATCH_SIZE);

    console.log(`[seed] Processing batch ${chunkNumber}/${totalChunks} (items ${b + 1} to ${Math.min(b + BATCH_SIZE, productsToCreate.length)})...`);

    const { result: createdProducts } = await createProductsWorkflow(container).run({
      input: { products: chunk },
    });

    // Collect created variant inventory item links
    for (let cIdx = 0; cIdx < createdProducts.length; cIdx++) {
      const p = createdProducts[cIdx];
      const prodNum = b + cIdx + 1;

      // Determine stock quantity strategy:
      // index % 25 === 0 -> out of stock (0)
      // index % 15 === 0 -> low stock (3-8 units)
      // default -> normal stock (50-250 units)
      let quantity = 75;
      if (prodNum % 25 === 0) {
        quantity = 0;
      } else if (prodNum % 15 === 0) {
        quantity = 5;
      } else {
        quantity = 50 + (prodNum % 200);
      }

      if (p.variants) {
        for (const variant of p.variants) {
          // Query variant's inventory item
          const varQuery = await query({
            entryPoint: "product_variant",
            fields: ["id", "inventory_items.inventory_item_id"],
            variables: { filters: { id: variant.id } },
          });

          const itemId = varQuery[0]?.inventory_items?.[0]?.inventory_item_id;
          if (itemId) {
            createdVariantsWithStock.push({
              inventory_item_id: itemId,
              quantity,
            });
          }
        }
      }
    }
  }

  // 9. Batch Create Inventory Levels
  console.log(`[seed] Populating inventory levels for ${createdVariantsWithStock.length} inventory items at ${stockLocation.name}...`);
  const INV_BATCH_SIZE = 100;
  for (let i = 0; i < createdVariantsWithStock.length; i += INV_BATCH_SIZE) {
    const invChunk = createdVariantsWithStock.slice(i, i + INV_BATCH_SIZE).map((item) => ({
      inventory_item_id: item.inventory_item_id,
      location_id: stockLocation.id,
      stocked_quantity: item.quantity,
    }));

    await inventoryModule.createInventoryLevels(invChunk);
    console.log(`[seed] Set inventory levels for batch ${Math.floor(i / INV_BATCH_SIZE) + 1}/${Math.ceil(createdVariantsWithStock.length / INV_BATCH_SIZE)}`);
  }

  // 10. Final Verification Stats
  const finalProducts = await query({ entryPoint: "product", fields: ["id"] });
  const finalVariants = await query({ entryPoint: "product_variant", fields: ["id", "sku"] });
  const finalCategories = await query({ entryPoint: "product_category", fields: ["id", "name"] });
  const finalCollections = await query({ entryPoint: "product_collection", fields: ["id", "title"] });
  const finalInventory = await query({ entryPoint: "inventory_level", fields: ["id", "stocked_quantity"] });

  console.log("==============================================================================");
  console.log("[seed] SEEDING COMPLETED SUCCESSFULLY");
  console.log(`- Total Products in Database:   ${finalProducts.length}`);
  console.log(`- Total Variants in Database:   ${finalVariants.length}`);
  console.log(`- Total Categories:             ${finalCategories.length}`);
  console.log(`- Total Collections:            ${finalCollections.length}`);
  console.log(`- Total Inventory Levels Set:   ${finalInventory.length}`);
  console.log("==============================================================================");
}
