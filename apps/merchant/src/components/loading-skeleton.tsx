import React from "react";

export function MetricCardSkeleton() {
  return (
    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="w-24 h-3.5 bg-slate-200 rounded" />
        <div className="w-7 h-7 bg-slate-100 rounded-lg" />
      </div>
      <div className="w-32 h-7 bg-slate-200 rounded mb-2" />
      <div className="w-20 h-3 bg-slate-100 rounded" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <tr className="border-b border-slate-100 animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <div className="h-4 bg-slate-100 rounded w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

