"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { HeroSlide, ThemePresetId } from "@the-ecom-buddy/types";

interface HeroSliderProps {
  slides: HeroSlide[];
  autoplay?: boolean;
  autoplaySpeed?: number;
  showArrows?: boolean;
  showDots?: boolean;
  presetId?: ThemePresetId;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({
  slides = [],
  autoplay = true,
  autoplaySpeed = 5000,
  showArrows = true,
  showDots = true,
  presetId = "crescendo",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const activeSlides = slides.filter((s) => s.isActive);
  const count = activeSlides.length;

  const goToNext = useCallback(() => {
    if (count <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % count);
  }, [count]);

  const goToPrev = useCallback(() => {
    if (count <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + count) % count);
  }, [count]);

  // Autoplay timer with reduced motion support
  useEffect(() => {
    if (!autoplay || count <= 1 || isPaused) return;

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timer = setInterval(() => {
      goToNext();
    }, autoplaySpeed || 5000);

    return () => clearInterval(timer);
  }, [autoplay, autoplaySpeed, count, isPaused, goToNext]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goToPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goToNext();
    }
  };

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      goToNext();
    } else if (distance < -minSwipeDistance) {
      goToPrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (count === 0) return null;

  const currentSlide = activeSlides[currentIndex];

  const alignmentClass =
    currentSlide.textAlignment === "center"
      ? "items-center text-center mx-auto"
      : currentSlide.textAlignment === "right"
      ? "items-end text-right ml-auto"
      : "items-start text-left mr-auto";

  return (
    <div
      ref={sliderRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Flagship Hero Presentation"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-preset={presetId}
      className={`relative w-full overflow-hidden bg-[var(--surface-base)] select-none focus:outline-none ${
        presetId === "velora"
          ? "py-8 sm:py-12 bg-gradient-to-b from-[var(--surface-base)] to-[var(--surface-subtle)]"
          : ""
      }`}
      style={{ minHeight: "500px", height: presetId === "velora" ? "76vh" : "72vh", maxHeight: "760px" }}
    >
      {/* Slides */}
      {activeSlides.map((slide, idx) => {
        const isCurrent = idx === currentIndex;
        return (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${idx + 1} of ${count}: ${slide.heading}`}
            aria-hidden={!isCurrent}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              isCurrent ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            {/* Visual Media Composition */}
            {presetId === "velora" ? (
              /* Velora Minimal Luxury: Asymmetrical tactile split hero */
              <div className="max-w-7xl h-full mx-auto px-6 sm:px-10 lg:px-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left Column: Editorial Typography */}
                <div className="lg:col-span-5 flex flex-col gap-4 text-left z-10 order-2 lg:order-1">
                  {slide.badge && (
                    <span className="self-start px-3 py-1 rounded-full text-xs font-serif italic tracking-wider bg-[var(--brand-accent)]/20 text-[var(--brand-accent)] border border-[var(--brand-accent)]/30">
                      {slide.badge}
                    </span>
                  )}
                  {slide.subheading && (
                    <span className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold">
                      {slide.subheading}
                    </span>
                  )}
                  <h1 className="font-[var(--font-display)] text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[var(--text-primary)] leading-[1.2]">
                    {slide.heading}
                  </h1>
                  {slide.description && (
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-md">
                      {slide.description}
                    </p>
                  )}
                  {slide.ctaLabel && (
                    <div className="pt-2">
                      <a
                        href={slide.ctaDestination || "/products"}
                        className="inline-flex items-center gap-2 px-6 py-3 text-xs font-semibold uppercase tracking-widest rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)] transition-all shadow-md"
                      >
                        <span>{slide.ctaLabel}</span>
                        <span>&rarr;</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Right Column: Framed Arch/Stone Image */}
                <div className="lg:col-span-7 h-full flex items-center justify-center order-1 lg:order-2">
                  <div className="relative w-full max-w-lg aspect-[4/3] rounded-3xl overflow-hidden border border-[var(--border-subtle)] shadow-2xl bg-[var(--surface-muted)]">
                    <img
                      src={slide.desktopImageUrl || slide.mobileImageUrl}
                      alt={slide.heading}
                      className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  </div>
                </div>
              </div>
            ) : (
              /* Full-Bleed Composition for Crescendo, Aero Step & Philox */
              <>
                <picture className="absolute inset-0 w-full h-full">
                  {slide.mobileImageUrl && (
                    <source media="(max-width: 768px)" srcSet={slide.mobileImageUrl} />
                  )}
                  <img
                    src={slide.desktopImageUrl || slide.mobileImageUrl}
                    alt={slide.heading}
                    className="w-full h-full object-cover object-center"
                  />
                </picture>

                {/* Darkening / tint overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: slide.overlayColor || "#0B0F19",
                    opacity: (slide.overlayOpacity ?? 40) / 100,
                  }}
                />

                {/* Content Overlay */}
                <div className="relative z-10 max-w-7xl h-full mx-auto px-6 sm:px-10 lg:px-16 flex flex-col justify-center">
                  <div className={`max-w-2xl flex flex-col gap-4 ${alignmentClass}`}>
                    {/* Badge / Pill */}
                    {slide.badge && (
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          presetId === "aero_step"
                            ? "bg-[var(--brand-primary)] text-white shadow-lg transform -skew-x-6"
                            : presetId === "philox"
                            ? "bg-white text-emerald-800 shadow"
                            : "bg-white/20 text-white backdrop-blur-md border border-white/20"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        {slide.badge}
                      </span>
                    )}

                    {/* Subheading */}
                    {slide.subheading && (
                      <span
                        style={{ color: slide.textColor || "#FFFFFF" }}
                        className="text-xs sm:text-sm font-semibold tracking-widest uppercase opacity-90"
                      >
                        {slide.subheading}
                      </span>
                    )}

                    {/* Heading */}
                    <h1
                      style={{ color: slide.textColor || "#FFFFFF" }}
                      className={`font-[var(--font-display)] text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15] ${
                        presetId === "aero_step" ? "uppercase tracking-tighter italic" : ""
                      }`}
                    >
                      {slide.heading}
                    </h1>

                    {/* Description */}
                    {slide.description && (
                      <p
                        style={{ color: slide.textColor || "#FFFFFF" }}
                        className="text-sm sm:text-base lg:text-lg opacity-85 leading-relaxed max-w-xl"
                      >
                        {slide.description}
                      </p>
                    )}

                    {/* CTA Buttons */}
                    {slide.ctaLabel && (
                      <div className="pt-2 flex flex-wrap items-center gap-3">
                        <a
                          href={slide.ctaDestination || "/products"}
                          style={{
                            backgroundColor: slide.buttonBgColor || "var(--brand-primary)",
                            color: slide.buttonTextColor || "#FFFFFF",
                          }}
                          className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-[var(--theme-radius)] shadow-lg hover:brightness-110 active:scale-95 transition-all ${
                            presetId === "aero_step" ? "uppercase tracking-wider font-extrabold" : ""
                          }`}
                        >
                          <span>{slide.ctaLabel}</span>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </a>

                        {/* Philox Dual CTA */}
                        {presetId === "philox" && (
                          <a
                            href="/collections/festive-specials"
                            className="inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-semibold rounded-[var(--theme-radius)] bg-white/20 text-white backdrop-blur-md hover:bg-white/30 border border-white/30 transition-all"
                          >
                            <span>Browse Offers</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Crescendo Electronics Technical Specs Ticker Bar (Ref 02) */}
      {presetId === "crescendo" && (
        <div className="absolute bottom-0 inset-x-0 z-20 bg-black/80 backdrop-blur-md border-t border-white/10 px-4 py-2 hidden sm:flex items-center justify-between text-[11px] font-mono text-emerald-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              DIRECT AUDIO ENGINE
            </span>
            <span className="text-stone-500">•</span>
            <span className="text-stone-300">HI-RES AUDIO SPEC</span>
            <span className="text-stone-500">•</span>
            <span className="text-stone-300">STUDIO MASTERING READY</span>
          </div>
          <div className="text-stone-400">
            SLIDE {currentIndex + 1} / {count}
          </div>
        </div>
      )}

      {/* Aero Step Dynamic Slide Index Counter (Ref 04) */}
      {presetId === "aero_step" && (
        <div className="absolute top-6 right-6 z-20 hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/20 font-mono text-xs font-bold tracking-wider">
          <span className="text-[var(--brand-primary)]">0{currentIndex + 1}</span>
          <span className="text-white/40">/</span>
          <span>0{count}</span>
        </div>
      )}

      {/* Prev / Next Arrows */}
      {showArrows && count > 1 && (
        <div className="absolute inset-y-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-6 pointer-events-none">
          <button
            type="button"
            onClick={goToPrev}
            className={`pointer-events-auto p-2 sm:p-3 rounded-full backdrop-blur-sm border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] ${
              presetId === "velora"
                ? "bg-stone-100/80 hover:bg-stone-200 text-stone-800 border-stone-300 shadow"
                : "bg-black/40 hover:bg-black/70 text-white border-white/10"
            }`}
            aria-label="Previous slide"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goToNext}
            className={`pointer-events-auto p-2 sm:p-3 rounded-full backdrop-blur-sm border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] ${
              presetId === "velora"
                ? "bg-stone-100/80 hover:bg-stone-200 text-stone-800 border-stone-300 shadow"
                : "bg-black/40 hover:bg-black/70 text-white border-white/10"
            }`}
            aria-label="Next slide"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Slide Indicators: Dots or Velora Minimal Lines */}
      {showDots && count > 1 && (
        <div
          className={`absolute inset-x-0 z-20 flex items-center justify-center gap-2 ${
            presetId === "crescendo" ? "bottom-10" : "bottom-6"
          }`}
        >
          {activeSlides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`transition-all duration-300 focus:outline-none ${
                presetId === "velora"
                  ? `h-1 rounded-full ${
                      idx === currentIndex ? "w-10 bg-[var(--brand-primary)]" : "w-4 bg-stone-300 hover:bg-stone-400"
                    }`
                  : `h-2 rounded-full ${
                      idx === currentIndex ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/70"
                    }`
              }`}
              aria-label={`Go to slide ${idx + 1}`}
              aria-current={idx === currentIndex ? "true" : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};
