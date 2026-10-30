"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { HeroSlide } from "@the-ecom-buddy/types";

interface HeroSliderProps {
  slides: HeroSlide[];
  autoplay?: boolean;
  autoplaySpeed?: number;
  showArrows?: boolean;
  showDots?: boolean;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({
  slides = [],
  autoplay = true,
  autoplaySpeed = 5000,
  showArrows = true,
  showDots = true,
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

    // Check prefers-reduced-motion
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
      // Swiped left -> next
      goToNext();
    } else if (distance < -minSwipeDistance) {
      // Swiped right -> prev
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
      className="relative w-full overflow-hidden bg-[var(--surface-base)] select-none focus:outline-none"
      style={{ minHeight: "480px", height: "72vh", maxHeight: "740px" }}
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
            {/* Picture element for responsive image delivery */}
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

            {/* Slide Content Container */}
            <div className="relative z-10 max-w-7xl h-full mx-auto px-6 sm:px-10 lg:px-16 flex flex-col justify-center">
              <div className={`max-w-2xl flex flex-col gap-4 ${alignmentClass}`}>
                {/* Badge / Pill */}
                {slide.badge && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white backdrop-blur-md border border-white/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]" />
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
                  className="font-[var(--font-display)] text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15]"
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

                {/* CTA Button */}
                {slide.ctaLabel && (
                  <div className="pt-2">
                    <a
                      href={slide.ctaDestination || "#"}
                      style={{
                        backgroundColor: slide.buttonBgColor || "var(--brand-primary)",
                        color: slide.buttonTextColor || "#FFFFFF",
                      }}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-[var(--theme-radius)] shadow-lg hover:brightness-110 active:scale-95 transition-all"
                    >
                      <span>{slide.ctaLabel}</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Prev / Next Arrows */}
      {showArrows && count > 1 && (
        <div className="absolute inset-y-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-6 pointer-events-none">
          <button
            type="button"
            onClick={goToPrev}
            className="pointer-events-auto p-2 sm:p-3 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm border border-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            aria-label="Previous slide"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="pointer-events-auto p-2 sm:p-3 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm border border-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            aria-label="Next slide"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Slide Dots Indicator */}
      {showDots && count > 1 && (
        <div className="absolute bottom-6 inset-x-0 z-20 flex items-center justify-center gap-2">
          {activeSlides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 focus:outline-none ${
                idx === currentIndex
                  ? "w-8 bg-white"
                  : "w-2 bg-white/40 hover:bg-white/70"
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
