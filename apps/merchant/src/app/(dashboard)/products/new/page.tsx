"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckIcon,
  AlertCircleIcon,
  PackageIcon,
} from "@/components/icons";
import { ImageUploader, UploadedImage } from "@/components/image-uploader";
import {
  VariantMatrixBuilder,
  OptionGroup,
  MatrixVariant,
} from "@/components/variant-matrix-builder";

interface Category {
  id: string;
  name: string;
}

interface Collection {
  id: string;
  title: string;
}

export default function CreateProductPage() {
  const router = useRouter();

  // Basic Info
  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [autoHandle, setAutoHandle] = useState(true);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [hsCode, setHsCode] = useState("");
  const [requiresShipping, setRequiresShipping] = useState(true);

  // Organization
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");

  // Media
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  // Variants & Pricing
  const [options, setOptions] = useState<OptionGroup[]>([]);
  const [variants, setVariants] = useState<MatrixVariant[]>([
    {
      title: "Default",
      sku: "",
      options: {},
      prices: [{ currency_code: "inr", amount: 0 }],
      stock: 100,
    },
  ]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load Categories & Collections
  useEffect(() => {
    async function loadMeta() {
      try {
        const [catRes, colRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/collections"),
        ]);
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.product_categories || []);
        }
        if (colRes.ok) {
          const colData = await colRes.json();
          setCollections(colData.collections || []);
        }
      } catch (err) {
        console.warn("Failed to load metadata:", err);
      }
    }
    loadMeta();
  }, []);

  // Update handle when title changes if autoHandle is true
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (autoHandle) {
      setHandle(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      );
    }
  };

  const handleSubmit = async (targetStatus?: "draft" | "published") => {
    const finalStatus = targetStatus || status;

    if (!title.trim()) {
      setErrorMessage("Product title is required.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const finalHandle = handle.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      const payload: any = {
        title: title.trim(),
        handle: finalHandle,
        description: description.trim(),
        status: finalStatus,
        thumbnail: thumbnail || (images.length > 0 ? images[0].url : null),
        images: images.map((img) => ({ url: img.url })),
        collection_id: selectedCollectionId || null,
        categories: selectedCategoryIds.map((id) => ({ id })),
        hs_code: hsCode.trim() || null,
        requires_shipping: requiresShipping,
      };

      if (options.length > 0) {
        payload.options = options.map((o) => ({
          title: o.title.trim(),
          values: o.values,
        }));
      }

      payload.variants = variants.map((v) => ({
        title: v.title || "Default",
        sku: v.sku.trim() || `${finalHandle.toUpperCase()}-DEF`,
        options: v.options && Object.keys(v.options).length > 0 ? v.options : undefined,
        prices: v.prices.map((p) => ({
          currency_code: p.currency_code.toLowerCase(),
          amount: Math.round(Number(p.amount) || 0),
        })),
      }));

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to create product (HTTP ${res.status})`);
      }

      setSuccessMessage("Product created successfully! Redirecting...");
      setTimeout(() => {
        router.push("/products");
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save product.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back to products"
          >
            <ArrowLeftIcon size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <PackageIcon size={22} className="text-emerald-600" />
              Create New Product
            </h1>
            <p className="text-xs text-slate-500">
              Configure product details, multi-currency pricing, and variant matrix
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/products"
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => handleSubmit("draft")}
            disabled={isSubmitting}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("published")}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckIcon size={14} />
            )}
            Publish Product
          </button>
        </div>
      </div>

      {/* Status Banners */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircleIcon size={16} className="text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckIcon size={16} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main 2-Column Layout (SalesSync Reference-07 Authority) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Main Details & Variants (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Basic Information */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Basic Information
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Handcrafted Ceramic Mug"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  URL Handle (Slug)
                </label>
                <button
                  type="button"
                  onClick={() => setAutoHandle(!autoHandle)}
                  className="text-[11px] text-slate-500 hover:text-emerald-600"
                >
                  {autoHandle ? "Customize slug" : "Auto-generate"}
                </button>
              </div>
              <div className="relative flex items-center">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-400 font-mono">
                  /products/
                </span>
                <input
                  type="text"
                  value={handle}
                  disabled={autoHandle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="handcrafted-ceramic-mug"
                  className={`w-full pl-22 pr-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                    autoHandle ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe product materials, craftsmanship, dimensions, and unique selling points..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />
            </div>
          </div>

          {/* Card 2: Media / Gallery */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Media & Gallery
              </h3>
              <p className="text-xs text-slate-500">
                Upload product photography. The primary image is displayed on storefront catalog cards.
              </p>
            </div>

            <ImageUploader
              images={images}
              thumbnail={thumbnail}
              onChange={(newImgs, newThumb) => {
                setImages(newImgs);
                setThumbnail(newThumb);
              }}
            />
          </div>

          {/* Card 3: Variants & Multi-Currency Matrix */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <VariantMatrixBuilder
              handle={handle || "PROD"}
              onChange={(newOpts, newVars) => {
                setOptions(newOpts);
                setVariants(newVars);
              }}
            />
          </div>
        </div>

        {/* Right Column: Organization & Meta (1 Col) */}
        <div className="space-y-6">
          {/* Card 4: Status */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Publish Status
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="product-status"
                  value="draft"
                  checked={status === "draft"}
                  onChange={() => setStatus("draft")}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="block text-xs font-semibold text-slate-800">
                    Draft
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    Hidden from storefront catalog
                  </span>
                </div>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="product-status"
                  value="published"
                  checked={status === "published"}
                  onChange={() => setStatus("published")}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="block text-xs font-semibold text-slate-800">
                    Published
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    Live and purchasable by customers
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Card 5: Organization (Categories & Collections) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Organization
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Collection
              </label>
              <select
                value={selectedCollectionId}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800"
              >
                <option value="">No Collection</option>
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Categories
              </label>
              {categories.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No categories created</p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2.5 bg-slate-50/50">
                  {categories.map((cat) => {
                    const isChecked = selectedCategoryIds.includes(cat.id);
                    return (
                      <label
                        key={cat.id}
                        className="flex items-center gap-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategoryIds([...selectedCategoryIds, cat.id]);
                            } else {
                              setSelectedCategoryIds(
                                selectedCategoryIds.filter((id) => id !== cat.id)
                              );
                            }
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{cat.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Card 6: Shipping & Customs */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Shipping & Taxes
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                HSN / Harmonized Tariff Code
              </label>
              <input
                type="text"
                value={hsCode}
                onChange={(e) => setHsCode(e.target.value)}
                placeholder="e.g. 6109.10.00"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Required for Indian GST and international export documentation
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={requiresShipping}
                onChange={(e) => setRequiresShipping(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-medium text-slate-700">
                This product requires physical shipping
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

