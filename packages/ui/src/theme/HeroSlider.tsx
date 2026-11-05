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
  presetId = "velora",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const activeSlides = slides.filter((s) => s.isActive !== false);
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
      className="relative w-full overflow-hidden bg-[#FAFAF9] select-none focus:outline-none py-8 sm:py-12 lg:py-16"
      style={{ minHeight: "560px" }}
    >
      {/* Slides Viewport */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {activeSlides.map((slide, idx) => {
          const isCurrent = idx === currentIndex;
          return (
            <div
              key={slide.id || idx}
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${idx + 1} of ${count}: ${slide.heading}`}
              aria-hidden={!isCurrent}
              className={`transition-opacity duration-700 ease-in-out ${
                isCurrent ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none absolute inset-0"
              }`}
            >
              {/* Asymmetrical tactile split hero (Velora Minimal Luxury) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                
                {/* Left Column: Editorial Typography */}
                <div className="lg:col-span-6 flex flex-col items-start text-left z-10 order-2 lg:order-1 pt-4 lg:pt-0">
                  {/* Curated Pill Tag Badge */}
                  {slide.badge && (
                    <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-serif italic text-stone-700 bg-white/80 border border-stone-300/80 shadow-xs mb-3">
                      {slide.badge}
                    </span>
                  )}

                  {/* Kicker / Subheading */}
                  {slide.subheading && (
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 mb-2">
                      {slide.subheading}
                    </span>
                  )}

                  {/* Majestic Title */}
                  <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-normal tracking-tight text-stone-900 leading-[1.15] mb-4">
                    {slide.heading}
                  </h1>

                  {/* Description */}
                  {slide.description && (
                    <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-lg mb-6">
                      {slide.description}
                    </p>
                  )}

                  {/* CTA Button */}
                  {slide.ctaLabel && (
                    <div>
                      <a
                        href={slide.ctaDestination || "/products"}
                        className="inline-flex items-center gap-2 px-7 py-3.5 text-xs font-semibold uppercase tracking-widest rounded-lg bg-[#C28E5C] hover:bg-[#A87445] text-white shadow-sm hover:shadow transition-all group"
                      >
                        <span>{slide.ctaLabel}</span>
                        <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Right Column: Framed Arch/Stone Image */}
                <div className="lg:col-span-6 flex items-center justify-center order-1 lg:order-2">
                  <div className="relative w-full max-w-lg aspect-[4/3] rounded-3xl overflow-hidden border border-stone-200/80 shadow-xl bg-stone-100">
                    <img
                      src={slide.desktopImageUrl || slide.mobileImageUrl}
                      alt={slide.heading}
                      className="w-full h-full object-cover object-center"
                      loading={idx === 0 ? "eager" : "lazy"}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent pointer-events-none" />
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Prev / Next Circular Navigation Arrows */}
      {showArrows && count > 1 && (
        <div className="absolute inset-y-0 left-0 right-0 z-20 flex items-center justify-between px-3 sm:px-6 pointer-events-none">
          <button
            type="button"
            onClick={goToPrev}
            className="pointer-events-auto w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/90 hover:bg-white text-stone-800 border border-stone-200 shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#C28E5C]"
            aria-label="Previous slide"
          >
            <svg className="w-5 h-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="pointer-events-auto w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/90 hover:bg-white text-stone-800 border border-stone-200 shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#C28E5C]"
            aria-label="Next slide"
          >
            <svg className="w-5 h-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Slide Indicators: Minimalist Horizontal Bars */}
      {showDots && count > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2 z-20 relative">
          {activeSlides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`transition-all duration-300 focus:outline-none ${
                idx === currentIndex
                  ? "w-10 h-1 bg-[#C28E5C] rounded-full"
                  : "w-4 h-1 bg-stone-300 hover:bg-stone-400 rounded-full"
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
