import React from "react";

export type BadgeVariant =
  | "published"
  | "draft"
  | "proposed"
  | "rejected"
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "pending"
  | "completed"
  | "captured"
  | "canceled"
  | "failed"
  | "default";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant | string;
  className?: string;
  size?: "sm" | "md";
}

const variantStyles: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  captured: "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_stock: "bg-emerald-50 text-emerald-700 border-emerald-200",

  draft: "bg-amber-50 text-amber-700 border-amber-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  low_stock: "bg-amber-50 text-amber-700 border-amber-200",

  proposed: "bg-blue-50 text-blue-700 border-blue-200",

  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  canceled: "bg-rose-50 text-rose-700 border-rose-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
  out_of_stock: "bg-rose-50 text-rose-700 border-rose-200",

  default: "bg-slate-100 text-slate-700 border-slate-200",
};

export function Badge({
  children,
  variant = "default",
  className = "",
  size = "md",
}: BadgeProps) {
  const norm = (variant || "default").toLowerCase();
  const style = variantStyles[norm] || variantStyles.default;
  const sizeClasses =
    size === "sm"
      ? "text-[11px] px-1.5 py-0.5 leading-none"
      : "text-xs px-2 py-0.5 leading-tight font-medium";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium uppercase tracking-wider ${style} ${sizeClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {children}
    </span>
  );
}

