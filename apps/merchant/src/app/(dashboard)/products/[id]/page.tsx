"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  EditIcon,
  PackageIcon,
  AlertCircleIcon,
  ImageIcon,
} from "@/components/icons";
import { Badge } from "@/components/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { AdminProduct } from "@/lib/medusa-admin-client";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) {
          throw new Error(`Failed to load product (HTTP ${res.status})`);
        }
        const data = await res.json();
        setProduct(data.product);
      } catch (err: any) {
        setError(err.message || "Failed to load product details.");
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-16 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 font-medium">
          Loading product...
        </span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-xl mx-auto py-16 space-y-4 text-center">
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-center gap-2">
          <AlertCircleIcon size={16} className="text-red-600 shrink-0" />
          <span>{error || "Product not found"}</span>
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

  const anyP = product as any;
  const images: Array<{ url: string }> = anyP.images || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header */}
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
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {product.title}
              </h1>
              <Badge variant={product.status} size="sm">
                {product.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              ID: {product.id} • /{product.handle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/products/${id}/edit`}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <EditIcon size={14} />
            Edit Product
          </Link>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Variants */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Basic Information */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Description
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
              {product.description || "No description provided."}
            </p>
          </div>

          {/* Card: Variant Matrix & Pricing */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Variants & Pricing ({product.variants?.length || 0})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Purchasable variants with currency-specific amounts
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50/75 text-slate-600 font-medium">
                  <tr>
                    <th className="px-4 py-2.5">Variant</th>
                    <th className="px-4 py-2.5">SKU</th>
                    <th className="px-4 py-2.5">INR (Base)</th>
                    <th className="px-4 py-2.5">USD</th>
                    <th className="px-4 py-2.5">AED</th>
                    <th className="px-4 py-2.5">GBP</th>
                    <th className="px-4 py-2.5">EUR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {product.variants?.map((v) => {
                    const getCurrPrice = (code: string) => {
                      const p = v.prices?.find(
                        (pr) => pr.currency_code.toLowerCase() === code.toLowerCase()
                      );
                      return p ? formatCurrency(p.amount, code.toUpperCase()) : "—";
                    };

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          {v.title}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-500">
                          {v.sku || "—"}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900">
                          {getCurrPrice("inr")}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {getCurrPrice("usd")}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {getCurrPrice("aed")}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {getCurrPrice("gbp")}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {getCurrPrice("eur")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card: Media Gallery */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Product Images ({images.length})
            </h3>
            {images.length === 0 && !product.thumbnail ? (
              <p className="text-xs text-slate-400 italic">No images uploaded.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {(images.length > 0 ? images : [{ url: product.thumbnail! }]).map(
                  (img, idx) => (
                    <div
                      key={idx}
                      className="aspect-square rounded-lg border border-slate-200 overflow-hidden bg-slate-50 relative flex items-center justify-center"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={`Image ${idx + 1}`}
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                      <ImageIcon size={20} className="text-slate-400 absolute -z-0" />
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Organization & Meta */}
        <div className="space-y-6">
          {/* Card: Organization */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Organization
            </h3>

            <div>
              <span className="block text-[11px] font-medium text-slate-400">
                Collection
              </span>
              <span className="text-xs font-semibold text-slate-800">
                {product.collection?.title || "No collection"}
              </span>
            </div>

            <div>
              <span className="block text-[11px] font-medium text-slate-400 mb-1">
                Categories
              </span>
              {product.categories && product.categories.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {product.categories.map((c) => (
                    <span
                      key={c.id}
                      className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-md"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">No categories</span>
              )}
            </div>
          </div>

          {/* Card: Timestamps */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-2 text-xs text-slate-500">
            <div>
              <span className="font-medium text-slate-700">Created: </span>
              {formatDate(product.created_at, true)}
            </div>
            <div>
              <span className="font-medium text-slate-700">Updated: </span>
              {formatDate(product.updated_at, true)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
