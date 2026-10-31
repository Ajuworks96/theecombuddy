import type { PublicPublishedTheme, HeroSlide, HomepageSection } from "@the-ecom-buddy/types";

export interface StoreRegion {
  id: string;
  name: string;
  currency_code: string;
  countries?: Array<{ iso_2: string; display_name: string }>;
}

export interface StoreCategory {
  id: string;
  name: string;
  handle: string;
  description?: string | null;
  rank?: number;
  parent_category_id?: string | null;
  category_children?: StoreCategory[];
}

export interface StoreCollection {
  id: string;
  title: string;
  handle: string;
  description?: string | null;
  products_count?: number;
}

export interface StoreImage {
  id: string;
  url: string;
}

export interface StoreOptionValue {
  id: string;
  value: string;
  rank?: number | null;
}

export interface StoreProductOption {
  id: string;
  title: string;
  values?: StoreOptionValue[];
}

export interface StoreVariantOption {
  id: string;
  value: string;
  option_id?: string;
  option?: { id: string; title: string };
}

export interface StoreVariant {
  id: string;
  title: string;
  sku?: string | null;
  barcode?: string | null;
  ean?: string | null;
  upc?: string | null;
  allow_backorder?: boolean | null;
  manage_inventory?: boolean | null;
  inventory_quantity?: number | null;
  material?: string | null;
  weight?: number | null;
  length?: number | null;
  height?: number | null;
  width?: number | null;
  origin_country?: string | null;
  hs_code?: string | null;
  mid_code?: string | null;
  thumbnail?: string | null;
  product_id?: string;
  options?: StoreVariantOption[];
  calculated_price?: {
    calculated_amount: number;
    currency_code: string;
    original_amount?: number;
  } | null;
  prices?: Array<{
    id: string;
    currency_code: string;
    amount: number;
  }>;
}

export interface StoreProduct {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  handle: string;
  thumbnail?: string | null;
  images?: StoreImage[];
  collection_id?: string | null;
  collection?: { id: string; title: string; handle: string } | null;
  categories?: StoreCategory[];
  options?: StoreProductOption[];
  variants?: StoreVariant[];
  material?: string | null;
  weight?: number | null;
  length?: number | null;
  height?: number | null;
  width?: number | null;
  origin_country?: string | null;
  hs_code?: string | null;
  tags?: Array<{ id: string; value: string }>;
  discountable?: boolean;
}

export interface CartLineItem {
  id: string;
  title: string;
  subtitle?: string | null;
  thumbnail?: string | null;
  quantity: number;
  unit_price: number;
  total?: number;
  subtotal?: number;
  variant_id: string;
  variant?: StoreVariant;
  product_id?: string;
  product?: StoreProduct;
}

export interface StoreCartAddress {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  address_1?: string | null;
  address_2?: string | null;
  city?: string | null;
  country_code?: string | null;
  province?: string | null;
  postal_code?: string | null;
  phone?: string | null;
}

export interface StoreShippingMethod {
  id: string;
  shipping_option_id?: string;
  name?: string;
  amount: number;
  is_tax_inclusive?: boolean;
  data?: any;
}

export interface StoreShippingOption {
  id: string;
  name: string;
  price_type: string;
  amount: number;
  is_tax_inclusive?: boolean;
  insufficient_inventory?: boolean;
  calculated_price?: {
    calculated_amount: number;
    is_calculated_price_tax_inclusive?: boolean;
  };
}

export interface StorePromotion {
  id: string;
  code: string;
  type?: string;
  is_automatic?: boolean;
}

export interface StoreCart {
  id: string;
  region_id: string;
  currency_code: string;
  email?: string | null;
  items?: CartLineItem[];
  item_subtotal?: number;
  item_total?: number;
  subtotal?: number;
  discount_total?: number;
  discount_subtotal?: number;
  shipping_total?: number;
  shipping_subtotal?: number;
  tax_total?: number;
  total?: number;
  original_total?: number;
  shipping_address?: StoreCartAddress | null;
  billing_address?: StoreCartAddress | null;
  shipping_methods?: StoreShippingMethod[];
  promotions?: StorePromotion[];
  metadata?: Record<string, any> | null;
  region?: StoreRegion;
  completed_at?: string | null;
}

export interface StoreOrder {
  id: string;
  display_id: number;
  status: string;
  email: string;
  currency_code: string;
  created_at: string;
  items?: Array<{
    id: string;
    title: string;
    subtitle?: string | null;
    thumbnail?: string | null;
    quantity: number;
    unit_price: number;
    total?: number;
    variant_id?: string;
    variant?: StoreVariant;
  }>;
  shipping_address?: StoreCartAddress | null;
  billing_address?: StoreCartAddress | null;
  shipping_methods?: StoreShippingMethod[];
  payment_collections?: Array<{
    id: string;
    status: string;
    payments?: Array<{
      id: string;
      amount: number;
      provider_id: string;
      captured_at?: string | null;
    }>;
  }>;
  subtotal?: number;
  discount_total?: number;
  shipping_total?: number;
  tax_total?: number;
  total: number;
}

export interface StorefrontThemeProps {
  theme: PublicPublishedTheme;
  products?: StoreProduct[];
  categories?: StoreCategory[];
  regions?: StoreRegion[];
  currentRegion?: StoreRegion;
  cartItemCount?: number;
  onOpenCartDrawer?: () => void;
  onSelectRegion?: (region: StoreRegion) => void;
  isMerchantPreview?: boolean;
}
