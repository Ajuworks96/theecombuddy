"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CollectionsIcon,
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
import { formatDate } from "@/lib/formatters";

interface Collection {
  id: string;
  title: string;
  handle: string;
  created_at: string;
  updated_at: string;
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete Modal State
  const [deletingCollection, setDeletingCollection] = useState<Collection | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/collections");
      if (!res.ok) {
        throw new Error(`Failed to load collections (HTTP ${res.status})`);
      }
      const data = await res.json();
      setCollections(data.collections || []);
    } catch (err: any) {
      setError(err.message || "Failed to load collections.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const openCreateModal = () => {
    setEditingCollection(null);
    setTitle("");
    setHandle("");
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (col: Collection) => {
    setEditingCollection(col);
    setTitle(col.title);
    setHandle(col.handle);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setModalError("Collection title is required.");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    const payload: any = {
      title: title.trim(),
      handle: handle.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    };

    try {
      const url = editingCollection
        ? `/api/collections/${editingCollection.id}`
        : "/api/collections";
      const method = editingCollection ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save collection");
      }

      setToastMessage(
        editingCollection
          ? `Collection "${title}" updated successfully.`
          : `Collection "${title}" created successfully.`
      );
      setTimeout(() => setToastMessage(null), 4000);
      setIsModalOpen(false);
      fetchCollections();
    } catch (err: any) {
      setModalError(err.message || "Failed to save collection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCollection) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/collections/${deletingCollection.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete collection");
      }

      setToastMessage(`Collection "${deletingCollection.title}" removed.`);
      setTimeout(() => setToastMessage(null), 4000);
      setDeletingCollection(null);
      fetchCollections();
    } catch (err: any) {
      alert(err.message || "Failed to delete collection.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCollections = collections.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CollectionsIcon size={20} className="text-emerald-600" />
            Product Collections
          </h2>
          <p className="text-xs text-slate-500">
            Group products into curated seasonal, marketing, or promotional collections.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCollections}
            disabled={loading}
            title="Refresh collections"
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 transition-colors"
          >
            <RefreshIcon size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors shrink-0"
          >
            <PlusIcon size={14} />
            <span>Add Collection</span>
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
            placeholder="Search collections..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total Collections: <span className="text-slate-900 font-semibold">{collections.length}</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircleIcon size={16} className="text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Collections Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0B0F19] text-slate-300 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Collection Title</th>
                <th className="py-3 px-4">Handle (URL Slug)</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={4} />
                ))
              ) : filteredCollections.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12">
                    <EmptyState
                      icon={<CollectionsIcon size={24} />}
                      title="No collections found"
                      description={
                        searchQuery
                          ? `No collections matched "${searchQuery}".`
                          : "Get started by organizing products into collections."
                      }
                      action={
                        searchQuery
                          ? { label: "Clear search", onClick: () => setSearchQuery("") }
                          : { label: "Add Collection", onClick: openCreateModal }
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredCollections.map((col) => (
                  <tr key={col.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {col.title}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      /{col.handle}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {formatDate(col.created_at, false)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(col)}
                          className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit collection"
                        >
                          <EditIcon size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCollection(col)}
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Delete collection"
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

      {/* Add / Edit Collection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingCollection ? "Edit Collection" : "Add Product Collection"}
                </h3>
                <p className="text-xs text-slate-500">
                  Create targeted groupings for marketing and seasonal promotions
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
                  Collection Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!editingCollection) {
                      setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                    }
                  }}
                  placeholder="e.g. Summer Essentials"
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
                  placeholder="summer-essentials"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
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
                {editingCollection ? "Save Changes" : "Create Collection"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCollection && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <TrashIcon size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Collection?
                </h3>
                <p className="text-xs text-slate-500">
                  Remove collection grouping
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete collection <strong>&ldquo;{deletingCollection.title}&rdquo;</strong>? Products in this collection will remain in the catalog.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCollection(null)}
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
