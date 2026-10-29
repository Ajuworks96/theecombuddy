"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CategoriesIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  RefreshIcon,
  AlertCircleIcon,
  CheckIcon,
} from "@/components/icons";
import { TableRowSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";

interface Category {
  id: string;
  name: string;
  handle: string;
  description?: string;
  is_active: boolean;
  parent_category_id?: string | null;
  category_children?: Category[];
  created_at: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete Modal State
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) {
        throw new Error(`Failed to load categories (HTTP ${res.status})`);
      }
      const data = await res.json();
      setCategories(data.product_categories || []);
    } catch (err: any) {
      setError(err.message || "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName("");
    setHandle("");
    setDescription("");
    setParentCategoryId("");
    setIsActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setHandle(cat.handle);
    setDescription(cat.description || "");
    setParentCategoryId(cat.parent_category_id || "");
    setIsActive(cat.is_active !== false);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setModalError("Category name is required.");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    const payload: any = {
      name: name.trim(),
      handle: handle.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: description.trim(),
      parent_category_id: parentCategoryId || null,
      is_active: isActive,
    };

    try {
      const url = editingCategory
        ? `/api/categories/${editingCategory.id}`
        : "/api/categories";
      const method = editingCategory ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save category");
      }

      setToastMessage(
        editingCategory
          ? `Category "${name}" updated successfully.`
          : `Category "${name}" created successfully.`
      );
      setTimeout(() => setToastMessage(null), 4000);
      setIsModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      setModalError(err.message || "Failed to save category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/categories/${deletingCategory.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete category");
      }

      setToastMessage(`Category "${deletingCategory.name}" removed.`);
      setTimeout(() => setToastMessage(null), 4000);
      setDeletingCategory(null);
      fetchCategories();
    } catch (err: any) {
      alert(err.message || "Failed to delete category.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CategoriesIcon size={20} className="text-emerald-600" />
            Product Categories
          </h2>
          <p className="text-xs text-slate-500">
            Organize catalog products into hierarchical taxonomy for navigation and filtering.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCategories}
            disabled={loading}
            title="Refresh categories"
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 transition-colors"
          >
            <RefreshIcon size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors shrink-0"
          >
            <PlusIcon size={14} />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 shadow-2xs">
          <CheckIcon size={16} className="text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 sm:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <SearchIcon size={14} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total Categories: <span className="text-slate-900 font-semibold">{categories.length}</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircleIcon size={16} className="text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Category Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0B0F19] text-slate-300 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Category Name</th>
                <th className="py-3 px-4">Handle (URL Slug)</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={5} />
                ))
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12">
                    <EmptyState
                      icon={<CategoriesIcon size={24} />}
                      title="No categories found"
                      description={
                        searchQuery
                          ? `No categories matched "${searchQuery}".`
                          : "Get started by adding your first product category."
                      }
                      action={
                        searchQuery
                          ? { label: "Clear search", onClick: () => setSearchQuery("") }
                          : { label: "Add Category", onClick: openCreateModal }
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {cat.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      /{cat.handle}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-sm truncate">
                      {cat.description || "—"}
                    </td>
                    <td className="py-3 px-4">
                      {cat.is_active !== false ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit category"
                        >
                          <EditIcon size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCategory(cat)}
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Delete category"
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingCategory ? "Edit Category" : "Add Product Category"}
                </h3>
                <p className="text-xs text-slate-500">
                  Manage category name, slug, and hierarchical nesting
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircleIcon size={14} className="shrink-0 text-red-600" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingCategory) {
                      setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                    }
                  }}
                  placeholder="e.g. Specialty Beans"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL Handle (Slug)
                </label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="specialty-beans"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Category description..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parent Category
                </label>
                <select
                  value={parentCategoryId}
                  onChange={(e) => setParentCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800"
                >
                  <option value="">No Parent (Top-Level)</option>
                  {categories
                    .filter((c) => !editingCategory || c.id !== editingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-medium text-slate-700">
                  Category is active and visible in navigation
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckIcon size={14} />
                )}
                {editingCategory ? "Save Changes" : "Create Category"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <TrashIcon size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Category?
                </h3>
                <p className="text-xs text-slate-500">
                  Remove category taxonomy
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete category <strong>&ldquo;{deletingCategory.name}&rdquo;</strong>? Products assigned to this category will not be deleted.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
