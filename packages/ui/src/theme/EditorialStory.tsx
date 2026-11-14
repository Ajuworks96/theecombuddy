"use client";

import React from "react";
import type { HomepageSection } from "@the-ecom-buddy/types";

interface EditorialStoryProps {
  section?: HomepageSection;
}

export const EditorialStory: React.FC<EditorialStoryProps> = ({ section }) => {
  const cfg = section?.config || {};
  const badge = cfg.badge || "THE PHILOSOPHY";
  const headline = cfg.headline || "Fewer, Better Things — Designed to Outlast the Ephemeral.";
  const paragraph =
    cfg.paragraph ||
    "We stand against disposable culture. Every textile, studio instrument, and handcrafted object in our collection is created alongside master artisans who honor natural materials. Rooted in organic fibres, heirloom metals, and restorative botanicals that age with quiet dignity.";
  
  const mainImage =
    cfg.image ||
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80";
  const detailImage =
    cfg.detailImage ||
    "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80";

  return (
    <section className="w-full py-20 sm:py-28 bg-[#FAF9F5] border-t border-stone-200/60 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Asymmetrical Editorial Image Duo */}
          <div className="lg:col-span-7 grid grid-cols-12 gap-4 items-center">
            <div className="col-span-8 rounded-2xl overflow-hidden aspect-[4/5] shadow-lg border border-stone-200/80 bg-stone-100">
              <img
                src={mainImage}
                alt="Editorial Brand Story"
                className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="col-span-4 -ml-4 sm:-ml-8 pt-12">
              <div className="rounded-2xl overflow-hidden aspect-[3/4] shadow-xl border border-stone-200/80 bg-stone-100">
                <img
                  src={detailImage}
                  alt="Material Texture Detail"
                  className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-700"
                />
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-stone-500 font-medium text-center">
                Artisanal Detail No. 04
              </p>
            </div>
          </div>

          {/* Right Column: Editorial Manifesto */}
          <div className="lg:col-span-5 flex flex-col gap-6 lg:pl-4">
            <div className="flex items-center gap-3">
              <span className="w-6 h-px bg-[#C28E5C]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C28E5C]">
                {badge}
              </span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-stone-950 leading-[1.18]">
              {headline}
            </h2>

            <p className="text-sm sm:text-base text-stone-600 leading-relaxed font-normal">
              {paragraph}
            </p>

            {/* Quiet Pillar Commitments */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-stone-200">
              <div>
                <span className="font-serif text-2xl sm:text-3xl font-light text-stone-900">100%</span>
                <p className="text-[11px] uppercase tracking-wider text-stone-500 mt-1">Traceable Sourcing</p>
              </div>
              <div>
                <span className="font-serif text-2xl sm:text-3xl font-light text-stone-900">Zero</span>
                <p className="text-[11px] uppercase tracking-wider text-stone-500 mt-1">Synthetic Waste</p>
              </div>
              <div>
                <span className="font-serif text-2xl sm:text-3xl font-light text-stone-900">10-Yr</span>
                <p className="text-[11px] uppercase tracking-wider text-stone-500 mt-1">Heritage Longevity</p>
              </div>
            </div>

            <div className="pt-2">
              <a
                href="/about"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-900 hover:text-[#C28E5C] transition-colors group"
              >
                <span>Read The Full Manifesto</span>
                <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
