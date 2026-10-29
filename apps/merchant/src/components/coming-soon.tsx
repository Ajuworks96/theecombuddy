import React from "react";
import Link from "next/link";
import { AlertCircleIcon, ChevronLeftIcon } from "./icons";

interface ComingSoonProps {
  title: string;
  milestone: string;
  description: string;
  plannedFeatures: string[];
}

export function ComingSoonPlaceholder({
  title,
  milestone,
  description,
  plannedFeatures,
}: ComingSoonProps) {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeftIcon size={14} />
          Back to Overview
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded-full mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Scheduled for {milestone}
        </div>

        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
          {title}
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mb-6">
          {description}
        </p>

        <div className="border-t border-slate-100 pt-6">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
            Planned Architecture & Deliverables
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {plannedFeatures.map((feat, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg"
              >
                <AlertCircleIcon size={14} className="text-slate-400 shrink-0" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Official Medusa v2 Engine Connected</span>
          <span>Zero Fake Data Policy Enforced</span>
        </div>
      </div>
    </div>
  );
}

