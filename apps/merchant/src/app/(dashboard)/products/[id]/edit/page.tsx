"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckIcon,
  AlertCircleIcon,
  TrashIcon,
  PackageIcon,
} from "@/components/icons";
import { ImageUploader, UploadedImage } from "@/components/image-uploader";
import {
  VariantMatrixBuilder,
  OptionGroup,
  MatrixVariant,
} from "@/components/variant-matrix-builder";
import { AdminProduct } from "@/lib/medusa-admin-client";

interface Category {
  id: string;
  name: string;
}

interface Collection {
  id: string;
  title: string;
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
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

  // Variants & Matrix
  const [options, setOptions] = useState<OptionGroup[]>([]);
  const [variants, setVariants] = useState<MatrixVariant[]>([]);

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch product data and categories/collections
  useEffect(() => {
    async function loadProductAndMeta() {
      setLoading(true);
      setLoadError(null);
      try {
        const [prodRes, catRes, colRes] = await Promise.all([
          fetch(`/api/products/${id}`),
          fetch("/api/categories"),
          fetch("/api/collections"),
        ]);

        if (!prodRes.ok) {
          throw new Error(`Failed to load product (HTTP ${prodRes.status})`);
        }

        const prodData = await prodRes.json();
        const p: AdminProduct = prodData.product;

        setTitle(p.title || "");
        setHandle(p.handle || "");
        setDescription(p.description || "");
        setStatus(p.status === "published" ? "published" : "draft");
        setThumbnail(p.thumbnail || null);
        setSelectedCollectionId(p.collection_id || "");

        if (Array.isArray(p.categories)) {
          setSelectedCategoryIds(p.categories.map((c) => c.id));
        }

        // Images
        const anyP = p as any;
        if (Array.isArray(anyP.images)) {
          setImages(anyP.images.map((img: any) => ({ id: img.id, url: img.url })));
        } else if (p.thumbnail) {
          setImages([{ url: p.thumbnail }]);
        }

        // Options
        if (Array.isArray(p.options) && p.options.length > 0) {
          setOptions(
            p.options.map((opt) => ({
              id: opt.id,
              title: opt.title,
              values: (opt.values || []).map((v) => v.value),
            }))
          );
        }

        // Variants
        if (Array.isArray(p.variants) && p.variants.length > 0) {
          setVariants(
            p.variants.map((v) => {
              const optionMap: Record<string, string> = {};
              if (Array.isArray(v.options)) {
                v.options.forEach((vo: any) => {
                  const optDef = p.options?.find((o) => o.id === vo.option_id);
                  const optName = optDef ? optDef.title : "Option";
                  optionMap[optName] = vo.value;
                });
              }

              return {
                id: v.id,
                title: v.title || "Default",
                sku: v.sku || "",
                options: optionMap,
                prices: (v.prices || []).map((pr) => ({
                  currency_code: pr.currency_code,
                  amount: pr.amount,
                })),
                stock: v.inventory_quantity ?? 50,
              };
            })
          );
        }

        // Meta lists
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.product_categories || []);
        }
        if (colRes.ok) {
          const colData = await colRes.json();
          setCollections(colData.collections || []);
        }
      } catch (err: any) {
        setLoadError(err.message || "Failed to load product details.");
      } finally {
        setLoading(false);
      }
    }

    loadProductAndMeta();
  }, [id]);

  const handleSave = async (targetStatus?: "draft" | "published") => {
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
      const payload: any = {
        title: title.trim(),
        handle: handle.trim(),
        description: description.trim(),
        status: finalStatus,
        thumbnail: thumbnail || (images.length > 0 ? images[0].url : null),
        images: images.map((img) => ({ url: img.url })),
        collection_id: selectedCollectionId || null,
        category_ids: selectedCategoryIds,
        variants: variants.map((v) => ({
          id: v.id,
          title: v.title,
          sku: v.sku.trim(),
          options: v.options,
          prices: v.prices.map((p) => ({
            currency_code: p.currency_code.toLowerCase(),
            amount: Math.round(Number(p.amount) || 0),
          })),
        })),
      };

      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to update product (HTTP ${res.status})`);
      }

      setSuccessMessage("Product changes saved successfully!");
      setStatus(finalStatus);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save product changes.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Delete failed with status ${res.status}`);
      }

      router.push("/products");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete product.");
      setShowDeleteModal(false);
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 font-medium">
          Loading product details...
        </span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto py-12 space-y-4 text-center">
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
          {loadError}
        </div>
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <ArrowLeftIcon size={14} /> Back to Products
        </Link>
      </div>
    );
  }

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
              Edit Product: <span className="font-semibold text-slate-700">{title}</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Product ID: {id} • Status: {status}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
            title="Delete this product"
          >
            <TrashIcon size={16} />
          </button>
          <Link
            href="/products"
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckIcon size={14} />
            )}
            Save Changes
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

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Details & Matrix */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
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
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Product title"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                URL Handle
              </label>
              <div className="relative flex items-center">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-400 font-mono">
                  /products/
                </span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full pl-22 pr-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
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
                placeholder="Product description..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />
            </div>
          </div>

          {/* Media / Images */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Media & Gallery
              </h3>
              <p className="text-xs text-slate-500">
                Manage product imagery and select primary thumbnail
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

          {/* Variants & Matrix */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <VariantMatrixBuilder
              handle={handle || "PROD"}
              initialOptions={options}
              initialVariants={variants}
              onChange={(newOpts, newVars) => {
                setOptions(newOpts);
                setVariants(newVars);
              }}
            />
          </div>
        </div>

        {/* Right Column: Meta */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Publish Status
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="edit-product-status"
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
                  name="edit-product-status"
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

          {/* Organization */}
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
                                selectedCategoryIds.filter((cid) => cid !== cat.id)
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

          {/* Shipping & Customs */}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <TrashIcon size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Product?
                </h3>
                <p className="text-xs text-slate-500">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete <strong>&ldquo;{title}&rdquo;</strong> from your catalog? All variant SKUs and associated prices will be removed.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <TrashIcon size={14} />
                )}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

