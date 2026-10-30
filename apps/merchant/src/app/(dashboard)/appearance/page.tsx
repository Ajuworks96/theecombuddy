"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PaletteIcon,
  TypeIcon,
  SlidersIcon,
  LayoutIcon,
  ImageIcon,
  PlusIcon,
  TrashIcon,
  EditIcon,
  CopyIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  RefreshIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoveUpIcon,
  MoveDownIcon,
  UploadCloudIcon,
  XIcon,
  CheckIcon,
} from "@/components/icons";
import { Badge } from "@/components/badge";
import { THEME_PRESET_SPECS, StorefrontThemeRenderer } from "@the-ecom-buddy/ui";
import { ThemeConfig, ThemePresetId, HeroSlide, HomepageSection, ThemeVersionRecord } from "@the-ecom-buddy/types";

export default function AppearancePage() {
  const [activeTab, setActiveTab] = useState<
    "themes" | "identity" | "colors" | "typography" | "navigation" | "slider" | "sections" | "footer" | "preview"
  >("themes");

  // State
  const [theme, setTheme] = useState<ThemeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // History & Rollback modal
  const [history, setHistory] = useState<ThemeVersionRecord[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [rollingBackVersion, setRollingBackVersion] = useState<number | null>(null);

  // Slide Editor modal
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [isNewSlide, setIsNewSlide] = useState(false);
  const [showSlideModal, setShowSlideModal] = useState(false);

  // Preview Mode
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [previewData, setPreviewData] = useState<{ categories: any[]; products: any[] }>({
    categories: [],
    products: [],
  });

  // Fetch Theme
  const fetchTheme = useCallback(async () => {
    setLoading(true);
    setErrorNotice(null);
    try {
      const res = await fetch("/api/theme?status=draft");
      if (!res.ok) throw new Error(`Failed to load theme configuration (HTTP ${res.status})`);
      const data = await res.json();
      setTheme(data.theme);
      setHistory(data.history || []);
    } catch (err: any) {
      setErrorNotice(err.message || "Failed to load theme settings");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Preview Data (Real categories & products)
  const fetchPreviewMeta = useCallback(async () => {
    try {
      const res = await fetch("/api/theme/preview?status=draft");
      if (res.ok) {
        const data = await res.json();
        setPreviewData({
          categories: data.categories || [],
          products: data.products || [],
        });
      }
    } catch {
      // preview meta optional
    }
  }, []);

  useEffect(() => {
    fetchTheme();
    fetchPreviewMeta();
  }, [fetchTheme, fetchPreviewMeta]);

  // Notice timer
  useEffect(() => {
    if (successNotice) {
      const timer = setTimeout(() => setSuccessNotice(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successNotice]);

  // Save Draft
  const handleSaveDraft = async () => {
    if (!theme) return;
    setSaving(true);
    setErrorNotice(null);
    try {
      const res = await fetch("/api/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(theme),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to save draft (HTTP ${res.status})`);
      }
      const data = await res.json();
      setTheme(data.theme);
      setSuccessNotice("Draft changes saved successfully to database!");
    } catch (err: any) {
      setErrorNotice(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Publish Changes
  const handlePublish = async () => {
    if (!confirm("Are you sure you want to publish these changes? This will create a new live theme version.")) {
      return;
    }
    setPublishing(true);
    setErrorNotice(null);
    try {
      const res = await fetch("/api/theme/publish", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Publish failed (HTTP ${res.status})`);
      }
      const data = await res.json();
      setTheme(data.theme);
      setSuccessNotice(`Theme published live as Version ${data.theme.version}!`);
      fetchTheme();
    } catch (err: any) {
      setErrorNotice(err.message);
    } finally {
      setPublishing(false);
    }
  };

  // Apply Preset
  const handleApplyPreset = async (presetId: ThemePresetId) => {
    if (!confirm(`Apply preset '${THEME_PRESET_SPECS[presetId].name}'? This will update typography, colors, and layout styles.`)) {
      return;
    }
    setErrorNotice(null);
    try {
      const res = await fetch("/api/theme/preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetId }),
      });
      if (!res.ok) throw new Error("Failed to apply preset");
      const data = await res.json();
      setTheme(data.theme);
      setSuccessNotice(`Applied preset '${THEME_PRESET_SPECS[presetId].name}'!`);
    } catch (err: any) {
      setErrorNotice(err.message);
    }
  };

  // Rollback to Version
  const handleRollback = async (version: number) => {
    if (!confirm(`Rollback theme to Version ${version}? This will restore its colors, sections, and slides as your active draft.`)) {
      return;
    }
    setRollingBackVersion(version);
    setErrorNotice(null);
    try {
      const res = await fetch("/api/theme/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Rollback failed");
      }
      const data = await res.json();
      setTheme(data.theme);
      setShowHistoryModal(false);
      setSuccessNotice(`Rolled back successfully to Version ${version}!`);
      fetchTheme();
    } catch (err: any) {
      setErrorNotice(err.message);
    } finally {
      setRollingBackVersion(null);
    }
  };

  // File Upload Handler (Logo, Favicon, Hero images)
  const handleFileUpload = async (file: File, type: "logo" | "favicon" | "hero" | "banner", callback: (url: string) => void) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    try {
      const res = await fetch("/api/theme/media", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();
      callback(data.asset.url);
      setSuccessNotice(`Uploaded ${type} asset: ${data.asset.filename}`);
    } catch (err: any) {
      setErrorNotice(err.message);
    }
  };

  // --------------------------------------------------------------------------
  // SLIDE MANAGEMENT HANDLERS
  // --------------------------------------------------------------------------
  const openNewSlideModal = () => {
    if (!theme) return;
    const currentCount = theme.heroSlider?.slides?.length || 0;
    const newSlide: HeroSlide = {
      id: `slide_${Date.now()}`,
      isActive: true,
      displayOrder: currentCount + 1,
      heading: `Exclusive Collection Slide ${currentCount + 1}`,
      subheading: "LIMITED EDITION",
      description: "Discover handcrafted premium selections with doorstep delivery across India.",
      ctaLabel: "Shop Collection",
      ctaDestination: "/products",
      desktopImageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80",
      mobileImageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
      textAlignment: "left",
      overlayColor: "#0B0F19",
      overlayOpacity: 40,
      textColor: "#F9FAFB",
      buttonBgColor: theme.colors.brandPrimary || "#10B981",
      buttonTextColor: "#FFFFFF",
      badge: "New Release",
    };
    setEditingSlide(newSlide);
    setIsNewSlide(true);
    setShowSlideModal(true);
  };

  const openEditSlideModal = (slide: HeroSlide) => {
    setEditingSlide({ ...slide });
    setIsNewSlide(false);
    setShowSlideModal(true);
  };

  const handleSaveSlide = async () => {
    if (!editingSlide || !theme) return;
    try {
      let updatedSlides = [...(theme.heroSlider?.slides || [])];
      if (isNewSlide) {
        updatedSlides.push(editingSlide);
      } else {
        const idx = updatedSlides.findIndex((s) => s.id === editingSlide.id);
        if (idx !== -1) updatedSlides[idx] = editingSlide;
      }
      setTheme({
        ...theme,
        heroSlider: {
          ...theme.heroSlider,
          slides: updatedSlides,
        },
      });
      setShowSlideModal(false);
      setSuccessNotice(`Slide '${editingSlide.heading}' saved locally. Click 'Save Draft' to persist.`);
    } catch (err: any) {
      setErrorNotice(err.message);
    }
  };

  const handleDeleteSlide = (slideId: string) => {
    if (!theme) return;
    if (!confirm("Are you sure you want to delete this slide?")) return;
    const updatedSlides = (theme.heroSlider?.slides || [])
      .filter((s) => s.id !== slideId)
      .map((s, idx) => ({ ...s, displayOrder: idx + 1 }));
    setTheme({
      ...theme,
      heroSlider: {
        ...theme.heroSlider,
        slides: updatedSlides,
      },
    });
    setSuccessNotice("Slide removed. Remember to Save Draft.");
  };

  const handleDuplicateSlide = (slide: HeroSlide) => {
    if (!theme) return;
    const slides = theme.heroSlider?.slides || [];
    const duplicated: HeroSlide = {
      ...slide,
      id: `slide_dup_${Date.now()}`,
      displayOrder: slides.length + 1,
      heading: `${slide.heading} (Copy)`,
    };
    setTheme({
      ...theme,
      heroSlider: {
        ...theme.heroSlider,
        slides: [...slides, duplicated],
      },
    });
    setSuccessNotice("Slide duplicated! Unlimited slides supported.");
  };

  const handleMoveSlide = (index: number, direction: "up" | "down") => {
    if (!theme) return;
    const slides = [...(theme.heroSlider?.slides || [])];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;
    const temp = slides[index];
    slides[index] = slides[targetIdx];
    slides[targetIdx] = temp;
    const reordered = slides.map((s, idx) => ({ ...s, displayOrder: idx + 1 }));
    setTheme({
      ...theme,
      heroSlider: {
        ...theme.heroSlider,
        slides: reordered,
      },
    });
  };

  // --------------------------------------------------------------------------
  // SECTION MANAGEMENT HANDLERS
  // --------------------------------------------------------------------------
  const handleToggleSection = (sectionId: string) => {
    if (!theme) return;
    const sections = (theme.sections || []).map((sec) =>
      sec.id === sectionId ? { ...sec, isEnabled: !sec.isEnabled } : sec
    );
    setTheme({ ...theme, sections });
  };

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    if (!theme) return;
    const sections = [...(theme.sections || [])];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const temp = sections[index];
    sections[index] = sections[targetIdx];
    sections[targetIdx] = temp;
    const reordered = sections.map((s, idx) => ({ ...s, displayOrder: idx + 1 }));
    setTheme({ ...theme, sections: reordered });
  };

  if (loading || !theme) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshIcon className="animate-spin text-emerald-400" size={32} />
        <p className="text-slate-400 font-mono text-sm">Loading Store Appearance & Theme Architecture...</p>
      </div>
    );
  }

  const slides = theme.heroSlider?.slides || [];
  const currentPreviewSlide = slides[previewSlideIndex] || slides[0];

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner / Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <PaletteIcon className="text-emerald-400" size={24} />
              Store Appearance & White-Label Theme
            </h1>
            <Badge
              variant={theme.status === "published" ? "success" : "warning"}
              className="font-mono text-xs uppercase"
            >
              {theme.status === "published" ? `Live v${theme.version}` : `Draft v${theme.version}`}
            </Badge>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              Preset: {theme.presetName || "Crescendo"}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Independently self-hosted white-label customizer. Configure branding, typography, 6 default hero slides (with unlimited additions), and homepage sections without editing code.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition flex items-center gap-1.5"
          >
            <RefreshIcon size={14} />
            Version History ({history.length})
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition flex items-center gap-1.5 ${
              activeTab === "preview"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
            }`}
          >
            <EyeIcon size={14} />
            Preview
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg border border-slate-600 transition flex items-center gap-1.5"
          >
            {saving ? <RefreshIcon className="animate-spin" size={14} /> : <CheckCircleIcon size={14} />}
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-900/30 transition flex items-center gap-1.5"
          >
            {publishing ? <RefreshIcon className="animate-spin" size={14} /> : <CheckIcon size={14} />}
            {publishing ? "Publishing..." : "Publish Changes"}
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {successNotice && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 p-4 rounded-xl flex items-center gap-3 text-emerald-200 text-sm">
          <CheckCircleIcon size={18} className="text-emerald-400 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}
      {errorNotice && (
        <div className="bg-rose-950/80 border border-rose-500/50 p-4 rounded-xl flex items-center gap-3 text-rose-200 text-sm">
          <AlertTriangleIcon size={18} className="text-rose-400 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 overflow-x-auto space-x-1 no-scrollbar">
        {[
          { id: "themes", label: "Theme Presets", icon: PaletteIcon },
          { id: "identity", label: "Store Identity", icon: ImageIcon },
          { id: "colors", label: "Colors & Tokens", icon: SlidersIcon },
          { id: "typography", label: "Typography & Shape", icon: TypeIcon },
          { id: "navigation", label: "Header & Nav", icon: LayoutIcon },
          { id: "slider", label: `Hero Slider (${slides.length})`, icon: ImageIcon },
          { id: "sections", label: `Homepage Sections (${theme.sections?.length || 0})`, icon: LayoutIcon },
          { id: "footer", label: "Footer & Domain", icon: CheckCircleIcon },
          { id: "preview", label: "Live Preview", icon: EyeIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition ${
                isActive
                  ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: THEME PRESETS */}
      {/* ==================================================================== */}
      {activeTab === "themes" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(Object.keys(THEME_PRESET_SPECS) as ThemePresetId[]).map((presetId) => {
              const spec = THEME_PRESET_SPECS[presetId];
              const isSelected = theme.presetId === presetId;
              return (
                <div
                  key={presetId}
                  className={`bg-slate-900 border rounded-xl p-6 flex flex-col justify-between transition-all ${
                    isSelected
                      ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-950/40"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">{spec.name}</h3>
                          {isSelected && (
                            <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                              Active Preset
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{spec.tagline}</p>
                      </div>
                      <span className="text-xs font-mono bg-slate-800 text-slate-400 px-2.5 py-1 rounded">
                        Ref {spec.referenceSlot.split("-")[0]}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{spec.description}</p>

                    {/* Color Swatches Palette */}
                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Palette Swatches</span>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border border-slate-700 shadow-inner flex items-center justify-center text-[10px] font-mono text-white" style={{ backgroundColor: spec.defaultColors.surfaceBase }}>
                          Base
                        </div>
                        <div className="w-8 h-8 rounded border border-slate-700 shadow-inner flex items-center justify-center text-[10px] font-mono text-white" style={{ backgroundColor: spec.defaultColors.brandPrimary }}>
                          Pri
                        </div>
                        <div className="w-8 h-8 rounded border border-slate-700 shadow-inner flex items-center justify-center text-[10px] font-mono text-white" style={{ backgroundColor: spec.defaultColors.brandAccent }}>
                          Acc
                        </div>
                        <div className="w-8 h-8 rounded border border-slate-700 shadow-inner flex items-center justify-center text-[10px] font-mono text-white" style={{ backgroundColor: spec.defaultColors.headerBg }}>
                          Nav
                        </div>
                      </div>
                    </div>

                    {/* Metadata specs */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                      <div>Display: <span className="text-slate-200">{spec.displayFont}</span></div>
                      <div>Body: <span className="text-slate-200">{spec.bodyFont}</span></div>
                      <div>Corners: <span className="text-slate-200 capitalize">{spec.borderRadius}</span></div>
                      <div>Buttons: <span className="text-slate-200 capitalize">{spec.buttonStyle}</span></div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => handleApplyPreset(presetId)}
                      disabled={isSelected}
                      className={`w-full py-2.5 px-4 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 ${
                        isSelected
                          ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40"
                      }`}
                    >
                      {isSelected ? "Currently Active Preset" : `Apply ${spec.name}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: STORE IDENTITY */}
      {/* ==================================================================== */}
      {activeTab === "identity" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <ImageIcon className="text-emerald-400" size={18} />
            Store Identity & Contact Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Store Brand Name *</label>
              <input
                type="text"
                value={theme.identity?.storeName || ""}
                onChange={(e) =>
                  setTheme({ ...theme, identity: { ...theme.identity, storeName: e.target.value } })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Brand Tagline</label>
              <input
                type="text"
                value={theme.identity?.tagline || ""}
                onChange={(e) =>
                  setTheme({ ...theme, identity: { ...theme.identity, tagline: e.target.value } })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Logo Image URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={theme.identity?.logoUrl || ""}
                  onChange={(e) =>
                    setTheme({ ...theme, identity: { ...theme.identity, logoUrl: e.target.value } })
                  }
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 cursor-pointer flex items-center gap-1.5">
                  <UploadCloudIcon size={14} />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "logo", (url) => setTheme({ ...theme, identity: { ...theme.identity, logoUrl: url } }));
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Favicon URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={theme.identity?.faviconUrl || ""}
                  onChange={(e) =>
                    setTheme({ ...theme, identity: { ...theme.identity, faviconUrl: e.target.value } })
                  }
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 cursor-pointer flex items-center gap-1.5">
                  <UploadCloudIcon size={14} />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "favicon", (url) => setTheme({ ...theme, identity: { ...theme.identity, faviconUrl: url } }));
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Support Email</label>
              <input
                type="email"
                value={theme.identity?.contactEmail || ""}
                onChange={(e) =>
                  setTheme({ ...theme, identity: { ...theme.identity, contactEmail: e.target.value } })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Support Phone</label>
              <input
                type="text"
                value={theme.identity?.contactPhone || ""}
                onChange={(e) =>
                  setTheme({ ...theme, identity: { ...theme.identity, contactPhone: e.target.value } })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-medium text-slate-300">Physical Business Address</label>
              <input
                type="text"
                value={theme.identity?.contactAddress || ""}
                onChange={(e) =>
                  setTheme({ ...theme, identity: { ...theme.identity, contactAddress: e.target.value } })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: COLORS & DESIGN TOKENS */}
      {/* ==================================================================== */}
      {activeTab === "colors" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <SlidersIcon className="text-emerald-400" size={18} />
            Color Palette & Semantic Design Tokens
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { key: "brandPrimary", label: "Primary Brand Color", desc: "Main CTAs, active states, key accents" },
              { key: "brandAccent", label: "Accent / Highlight Color", desc: "Badges, promotional calls, secondary pills" },
              { key: "surfaceBase", label: "Surface Base Background", desc: "Main store canvas background" },
              { key: "surfaceSubtle", label: "Surface Subtle Card Bg", desc: "Product cards, elevated surfaces" },
              { key: "headerBg", label: "Header Background", desc: "Navigation bar background" },
              { key: "footerBg", label: "Footer Background", desc: "Bottom footer section background" },
              { key: "textPrimary", label: "Primary Text Color", desc: "Headings, titles, high contrast copy" },
              { key: "textSecondary", label: "Secondary Text Color", desc: "Body text, metadata, descriptions" },
              { key: "borderSubtle", label: "Subtle Border Color", desc: "Card outlines, divider lines" },
            ].map(({ key, label, desc }) => {
              const val = (theme.colors as any)[key] || "#FFFFFF";
              return (
                <div key={key} className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white">{label}</label>
                    <div
                      className="w-5 h-5 rounded border border-slate-600 shadow"
                      style={{ backgroundColor: val }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">{desc}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="color"
                      value={val}
                      onChange={(e) =>
                        setTheme({
                          ...theme,
                          colors: { ...theme.colors, [key]: e.target.value },
                        })
                      }
                      className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={val}
                      onChange={(e) =>
                        setTheme({
                          ...theme,
                          colors: { ...theme.colors, [key]: e.target.value },
                        })
                      }
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white uppercase focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: TYPOGRAPHY & SHAPE */}
      {/* ==================================================================== */}
      {activeTab === "typography" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <TypeIcon className="text-emerald-400" size={18} />
            Typography Hierarchy & Component Geometry
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Display / Heading Font</label>
              <select
                value={theme.typography?.displayFont || "Plus Jakarta Sans"}
                onChange={(e) =>
                  setTheme({
                    ...theme,
                    typography: { ...theme.typography, displayFont: e.target.value as any },
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Clean)</option>
                <option value="Playfair Display">Playfair Display (Editorial Serif)</option>
                <option value="Instrument Serif">Instrument Serif (Luxury Editorial)</option>
                <option value="Outfit">Outfit (Athletic Geometric)</option>
                <option value="Cinzel">Cinzel (Classical Heritage)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Body & Interface Font</label>
              <select
                value={theme.typography?.bodyFont || "Inter"}
                onChange={(e) =>
                  setTheme({
                    ...theme,
                    typography: { ...theme.typography, bodyFont: e.target.value as any },
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Inter">Inter (High-Legibility UI)</option>
                <option value="Plus Jakarta Sans">Plus Jakarta Sans (Harmonious)</option>
                <option value="Geist">Geist (Technical Minimalist)</option>
                <option value="Roboto">Roboto (Neutral Classic)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Border Radius Geometry</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: "none", label: "Sharp 0px" },
                  { id: "sm", label: "Sm 4px" },
                  { id: "md", label: "Md 8px" },
                  { id: "lg", label: "Lg 12px" },
                  { id: "full", label: "Pill 9999px" },
                ].map((item) => {
                  const isCur = theme.styling?.borderRadius === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setTheme({
                          ...theme,
                          styling: { ...theme.styling, borderRadius: item.id as any },
                        })
                      }
                      className={`p-2.5 text-xs font-medium rounded-lg border text-center transition ${
                        isCur
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Button Corner Styling</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "sharp", label: "Sharp Micro" },
                  { id: "rounded", label: "Rounded Subtle" },
                  { id: "pill", label: "Full Pill" },
                ].map((item) => {
                  const isCur = theme.styling?.buttonStyle === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setTheme({
                          ...theme,
                          styling: { ...theme.styling, buttonStyle: item.id as any },
                        })
                      }
                      className={`p-2.5 text-xs font-medium rounded-lg border text-center transition ${
                        isCur
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: HEADER & NAVIGATION */}
      {/* ==================================================================== */}
      {activeTab === "navigation" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <LayoutIcon className="text-emerald-400" size={18} />
            Header, Announcement Bar & Navigation Menu
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
              <div>
                <span className="text-sm font-semibold text-white">Announcement Top Bar</span>
                <p className="text-xs text-slate-400">Display seasonal promotion, free shipping notice, or coupon banner</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={theme.announcement?.enabled}
                  onChange={(e) =>
                    setTheme({
                      ...theme,
                      announcement: { ...theme.announcement, enabled: e.target.checked },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {theme.announcement?.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-slate-300">Announcement Copy Text</label>
                  <input
                    type="text"
                    value={theme.announcement?.text || ""}
                    onChange={(e) =>
                      setTheme({
                        ...theme,
                        announcement: { ...theme.announcement, text: e.target.value },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Destination Link</label>
                  <input
                    type="text"
                    value={theme.announcement?.linkUrl || ""}
                    onChange={(e) =>
                      setTheme({
                        ...theme,
                        announcement: { ...theme.announcement, linkUrl: e.target.value },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex gap-4 items-center">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Background Color</label>
                    <input
                      type="color"
                      value={theme.announcement?.bgColor || "#10B981"}
                      onChange={(e) =>
                        setTheme({
                          ...theme,
                          announcement: { ...theme.announcement, bgColor: e.target.value },
                        })
                      }
                      className="w-10 h-10 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Text Color</label>
                    <input
                      type="color"
                      value={theme.announcement?.textColor || "#FFFFFF"}
                      onChange={(e) =>
                        setTheme({
                          ...theme,
                          announcement: { ...theme.announcement, textColor: e.target.value },
                        })
                      }
                      className="w-10 h-10 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 6: HERO SLIDER BUILDER */}
      {/* ==================================================================== */}
      {activeTab === "slider" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ImageIcon className="text-emerald-400" size={18} />
                Hero Carousel Slide Manager
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Pre-configured with <strong className="text-white">6 default editorial slides</strong> (Crescendo Reference 02). Supports <strong className="text-white">unlimited dynamic slides</strong> with responsive desktop/mobile picture delivery.
              </p>
            </div>
            <button
              onClick={openNewSlideModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition flex items-center gap-2 self-start md:self-auto"
            >
              <PlusIcon size={14} />
              Add New Slide
            </button>
          </div>

          {/* Slides List */}
          <div className="space-y-3">
            {slides.map((slide, idx) => (
              <div
                key={slide.id}
                className={`bg-slate-900 border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                  slide.isActive ? "border-slate-800 hover:border-slate-700" : "border-slate-800/50 opacity-60"
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Order & Reorder arrows */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => handleMoveSlide(idx, "up")}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                    >
                      <MoveUpIcon size={14} />
                    </button>
                    <span className="text-xs font-mono font-bold text-slate-300">#{slide.displayOrder}</span>
                    <button
                      onClick={() => handleMoveSlide(idx, "down")}
                      disabled={idx === slides.length - 1}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                    >
                      <MoveDownIcon size={14} />
                    </button>
                  </div>

                  {/* Thumbnail */}
                  <div
                    className="w-20 h-14 rounded-lg bg-cover bg-center border border-slate-700 shrink-0 relative overflow-hidden"
                    style={{ backgroundImage: `url(${slide.desktopImageUrl})` }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundColor: slide.overlayColor,
                        opacity: (slide.overlayOpacity || 40) / 100,
                      }}
                    />
                  </div>

                  {/* Slide Info */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{slide.heading}</span>
                      {slide.badge && (
                        <span className="text-[10px] font-mono bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded">
                          {slide.badge}
                        </span>
                      )}
                      {!slide.isActive && (
                        <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1">{slide.description}</p>
                    <div className="text-[11px] font-mono text-slate-500">
                      CTA: <span className="text-slate-300">{slide.ctaLabel}</span> &rarr;{" "}
                      <span className="text-slate-400">{slide.ctaDestination}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    onClick={() => handleDuplicateSlide(slide)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
                    title="Duplicate slide"
                  >
                    <CopyIcon size={14} />
                  </button>
                  <button
                    onClick={() => openEditSlideModal(slide)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs transition flex items-center gap-1"
                  >
                    <EditIcon size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteSlide(slide.id)}
                    className="p-2 bg-slate-800 hover:bg-rose-900/50 text-rose-400 rounded-lg text-xs transition"
                    title="Delete slide"
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 7: HOMEPAGE SECTIONS */}
      {/* ==================================================================== */}
      {activeTab === "sections" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <LayoutIcon className="text-emerald-400" size={18} />
              Homepage Structured Sections Manager
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Reorder, show, or hide sections. Real Medusa product and category data will be automatically rendered in commerce blocks.
            </p>
          </div>

          <div className="space-y-3">
            {(theme.sections || []).map((sec, idx) => (
              <div
                key={sec.id}
                className={`p-4 bg-slate-950/70 border rounded-xl flex items-center justify-between gap-4 transition ${
                  sec.isEnabled ? "border-slate-800 hover:border-slate-700" : "border-slate-800/40 opacity-50"
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Order controls */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => handleMoveSection(idx, "up")}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                    >
                      <MoveUpIcon size={14} />
                    </button>
                    <span className="text-xs font-mono font-bold text-slate-300">{sec.displayOrder}</span>
                    <button
                      onClick={() => handleMoveSection(idx, "down")}
                      disabled={idx === (theme.sections?.length || 0) - 1}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                    >
                      <MoveDownIcon size={14} />
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{sec.title}</span>
                      <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                        {sec.type}
                      </span>
                    </div>
                    {sec.subtitle && <p className="text-xs text-slate-400 mt-0.5">{sec.subtitle}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sec.isEnabled}
                      onChange={() => handleToggleSection(sec.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 8: FOOTER & DOMAIN */}
      {/* ==================================================================== */}
      {activeTab === "footer" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <CheckCircleIcon className="text-emerald-400" size={18} />
            Footer Copyright & Custom Domain Setup
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Footer Tagline</label>
              <input
                type="text"
                value={theme.footer?.tagline || ""}
                onChange={(e) =>
                  setTheme({ ...theme, footer: { ...theme.footer, tagline: e.target.value } })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Copyright Text</label>
              <input
                type="text"
                value={theme.footer?.copyrightText || ""}
                onChange={(e) =>
                  setTheme({ ...theme, footer: { ...theme.footer, copyrightText: e.target.value } })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Primary Domain</label>
              <input
                type="text"
                disabled
                value={theme.domain?.primaryDomain || "localhost:3000"}
                className="w-full bg-slate-950 border border-slate-800 text-slate-400 rounded-lg px-3 py-2 text-sm font-mono cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Client Custom Domain</label>
              <input
                type="text"
                value={theme.domain?.customDomain || ""}
                placeholder="store.mybrand.com"
                onChange={(e) =>
                  setTheme({ ...theme, domain: { ...theme.domain, customDomain: e.target.value } })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 9: LIVE STOREFRONT PREVIEW */}
      {/* ==================================================================== */}
      {activeTab === "preview" && (
        <div className="space-y-6">
          {/* Device Frame Toggle Bar */}
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">Viewport Simulator:</span>
              <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
                {(["desktop", "tablet", "mobile"] as const).map((dev) => (
                  <button
                    key={dev}
                    onClick={() => setPreviewDevice(dev)}
                    className={`px-3 py-1 text-xs font-medium capitalize rounded transition ${
                      previewDevice === dev
                        ? "bg-emerald-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {dev}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs font-mono text-slate-400">
              Live Preview: <span className="text-emerald-400">{theme.presetName}</span> (Slide {previewSlideIndex + 1} of {slides.length})
            </div>
          </div>

          {/* Device Frame Simulator Canvas */}
          <div className="flex justify-center bg-slate-950/80 border border-slate-800 p-6 rounded-2xl min-h-[700px] overflow-x-auto">
            <div
              className={`transition-all duration-300 shadow-2xl rounded-xl overflow-hidden border border-slate-700 flex flex-col ${
                previewDevice === "desktop"
                  ? "w-full max-w-[1200px]"
                  : previewDevice === "tablet"
                  ? "w-[768px]"
                  : "w-[375px]"
              }`}
            >
              <StorefrontThemeRenderer
                theme={theme as any}
                categories={previewData.categories}
                products={previewData.products}
                isMerchantPreview={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SLIDE EDIT / CREATE MODAL */}
      {/* ==================================================================== */}
      {showSlideModal && editingSlide && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ImageIcon className="text-emerald-400" size={18} />
                {isNewSlide ? "Add New Hero Carousel Slide" : "Edit Hero Carousel Slide"}
              </h3>
              <button
                onClick={() => setShowSlideModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Slide Heading *</label>
                  <input
                    type="text"
                    value={editingSlide.heading}
                    onChange={(e) => setEditingSlide({ ...editingSlide, heading: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Subheading / Category Tag</label>
                  <input
                    type="text"
                    value={editingSlide.subheading || ""}
                    onChange={(e) => setEditingSlide({ ...editingSlide, subheading: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-slate-300">Description Copy</label>
                  <textarea
                    rows={2}
                    value={editingSlide.description}
                    onChange={(e) => setEditingSlide({ ...editingSlide, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">CTA Label</label>
                  <input
                    type="text"
                    value={editingSlide.ctaLabel}
                    onChange={(e) => setEditingSlide({ ...editingSlide, ctaLabel: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">CTA Destination Link</label>
                  <input
                    type="text"
                    value={editingSlide.ctaDestination}
                    onChange={(e) => setEditingSlide({ ...editingSlide, ctaDestination: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-slate-300">Desktop Background Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingSlide.desktopImageUrl}
                      onChange={(e) => setEditingSlide({ ...editingSlide, desktopImageUrl: e.target.value })}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                    <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 cursor-pointer flex items-center gap-1.5">
                      <UploadCloudIcon size={14} />
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, "hero", (url) => setEditingSlide({ ...editingSlide, desktopImageUrl: url }));
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Text Alignment</label>
                  <select
                    value={editingSlide.textAlignment}
                    onChange={(e) => setEditingSlide({ ...editingSlide, textAlignment: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="left">Left Aligned</option>
                    <option value="center">Centered</option>
                    <option value="right">Right Aligned</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Overlay Opacity ({editingSlide.overlayOpacity}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    value={editingSlide.overlayOpacity}
                    onChange={(e) => setEditingSlide({ ...editingSlide, overlayOpacity: Number(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Button Background Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingSlide.buttonBgColor}
                      onChange={(e) => setEditingSlide({ ...editingSlide, buttonBgColor: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editingSlide.buttonBgColor}
                      onChange={(e) => setEditingSlide({ ...editingSlide, buttonBgColor: e.target.value })}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Slide Active Status</label>
                  <div className="pt-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingSlide.isActive}
                        onChange={(e) => setEditingSlide({ ...editingSlide, isActive: e.target.checked })}
                        className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                      />
                      <span className="text-xs text-slate-300">Slide Enabled in Carousel</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowSlideModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSlide}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow"
              >
                Save Slide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VERSION HISTORY & ROLLBACK MODAL */}
      {/* ==================================================================== */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RefreshIcon className="text-emerald-400" size={18} />
                Theme Version History & Rollback
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <XIcon size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Each publication creates an immutable snapshot in your local PostgreSQL database. You can instantly restore any prior version.
            </p>

            <div className="space-y-3 pt-2">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Version {record.version}</span>
                      <Badge
                        variant={record.status === "published" ? "success" : "neutral"}
                        className="text-[10px] uppercase font-mono"
                      >
                        {record.status}
                      </Badge>
                      <span className="text-xs font-mono text-slate-400">{record.presetId}</span>
                    </div>
                    <p className="text-xs text-slate-400">{record.name}</p>
                    <span className="text-[10px] font-mono text-slate-500">
                      Created by {record.createdBy} on {new Date(record.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <button
                    onClick={() => handleRollback(record.version)}
                    disabled={rollingBackVersion === record.version}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition"
                  >
                    {rollingBackVersion === record.version ? "Restoring..." : "Restore"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
