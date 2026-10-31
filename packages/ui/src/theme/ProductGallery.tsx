"use client";

import React, { useState, useEffect, useRef } from "react";
import type { StoreImage } from "./types";

interface ProductGalleryProps {
  images?: StoreImage[];
  thumbnail?: string | null;
  title: string;
  presetId?: string;
  cardStyle?: "bordered" | "tactile" | "elevated" | "flat";
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  images = [],
  thumbnail,
  title,
  presetId = "crescendo",
  cardStyle = "bordered",
}) => {
  // Aggregate all unique images: thumbnail first if present, then gallery images
  const allImages = React.useMemo(() => {
    const list: string[] = [];
    if (thumbnail) list.push(thumbnail);
    for (const img of images) {
      if (img?.url && !list.includes(img.url)) {
        list.push(img.url);
      }
    }
    return list;
  }, [images, thumbnail]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const touchStartX = useRef<number | null>(null);

  const currentImage = allImages[activeIndex] || thumbnail || "";

  // Keyboard navigation for fullscreen & gallery
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
        setZoomLevel(1);
      } else if (e.key === "ArrowLeft") {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
      } else if (e.key === "ArrowRight") {
        setActiveIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, allImages.length]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Swiped left -> next
        setActiveIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
      } else {
        // Swiped right -> prev
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
      }
    }
    touchStartX.current = null;
  };

  // Card geometry based on preset and style
  const containerStyle =
    presetId === "crescendo"
      ? "rounded-none border border-[var(--border-strong)] bg-[#0B0F19]"
      : presetId === "velora"
      ? "rounded-2xl border border-[var(--border-subtle)] bg-[#FAFAF9] shadow-sm"
      : presetId === "aero_step"
      ? "rounded-xl border border-[var(--border-subtle)] bg-[#18181B] shadow-md"
      : "rounded-lg border border-[var(--border-subtle)] bg-white";

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 1. Main Preview Frame */}
      <div
        className={`relative w-full aspect-[4/5] sm:aspect-square overflow-hidden group select-none ${containerStyle}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {currentImage ? (
          <img
            src={currentImage}
            alt={`${title} - View ${activeIndex + 1}`}
            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            loading="eager"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)] bg-[var(--surface-muted)]">
            <svg className="w-16 h-16 stroke-1 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs mt-2">No product image available</span>
          </div>
        )}

        {/* Fullscreen Expand Button */}
        {currentImage && (
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
            aria-label="View fullscreen image"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        )}

        {/* Navigation Arrows for multi-image gallery */}
        {allImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm transition-opacity opacity-80 sm:opacity-0 group-hover:opacity-100 z-10"
              aria-label="Previous product image"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm transition-opacity opacity-80 sm:opacity-0 group-hover:opacity-100 z-10"
              aria-label="Next product image"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Mobile Image Counter Pill */}
            <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-black/70 text-white text-[11px] font-mono tracking-wider sm:hidden">
              {activeIndex + 1} / {allImages.length}
            </div>
          </>
        )}
      </div>

      {/* 2. Thumbnail Strip */}
      {allImages.length > 1 && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {allImages.map((img, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 overflow-hidden transition-all focus:outline-none ${
                  presetId === "crescendo"
                    ? "rounded-none"
                    : presetId === "velora"
                    ? "rounded-lg"
                    : presetId === "aero_step"
                    ? "rounded-md"
                    : "rounded-md"
                } ${
                  isActive
                    ? "ring-2 ring-[var(--brand-primary)] border-transparent opacity-100 scale-102"
                    : "border border-[var(--border-subtle)] opacity-60 hover:opacity-100 hover:border-[var(--border-strong)]"
                }`}
                aria-label={`Select view ${idx + 1}`}
              >
                <img
                  src={img}
                  alt={`${title} thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover object-center"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Fullscreen Lightbox Modal */}
      {isFullscreen && currentImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen Product Viewer"
        >
          {/* Header Bar */}
          <div className="w-full max-w-6xl flex items-center justify-between py-3 text-white">
            <div className="text-sm font-medium tracking-wide truncate max-w-md">
              {title} <span className="opacity-60 text-xs font-mono ml-2">({activeIndex + 1} / {allImages.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => (z === 1 ? 1.75 : 1))}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                aria-label={zoomLevel === 1 ? "Zoom in" : "Reset zoom"}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {zoomLevel === 1 ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                  )}
                </svg>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFullscreen(false);
                  setZoomLevel(1);
                }}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                aria-label="Close fullscreen"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Image Container with Zoom */}
          <div className="relative flex-1 w-full max-w-5xl flex items-center justify-center overflow-auto">
            <img
              src={currentImage}
              alt={`${title} enlarged view`}
              style={{ transform: `scale(${zoomLevel})` }}
              className="max-h-[80vh] max-w-full object-contain transition-transform duration-300 cursor-zoom-in"
              onClick={() => setZoomLevel((z) => (z === 1 ? 1.75 : 1))}
            />
          </div>

          {/* Fullscreen Bottom Thumbnail Bar */}
          {allImages.length > 1 && (
            <div className="flex items-center gap-2 py-3 overflow-x-auto max-w-full">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveIndex(idx);
                    setZoomLevel(1);
                  }}
                  className={`w-12 h-12 rounded overflow-hidden transition-all ${
                    idx === activeIndex
                      ? "ring-2 ring-white scale-105 opacity-100"
                      : "opacity-40 hover:opacity-80"
                  }`}
                  aria-label={`Thumbnail ${idx + 1}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
