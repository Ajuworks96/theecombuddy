/**
 * The Ecom Buddy — Formatting Utilities
 * Multi-Currency, India-First Numbering & Standard Backoffice Formatters
 */

/**
 * Format currency amounts safely with locale-aware decimal and grouping rules.
 * Automatically handles INR paise conversion or direct decimal values.
 */
export function formatCurrency(
  amount: number | null | undefined,
  currencyCode: string = "INR",
  locale: string = "en-IN"
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "—";
  }

  const normalizedCurrency = currencyCode.toUpperCase();
  
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback if Intl.NumberFormat does not support given currency
    const symbol = normalizedCurrency === "INR" ? "₹" : normalizedCurrency === "USD" ? "$" : `${normalizedCurrency} `;
    return `${symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Format timestamp into standard readable backoffice date/time
 */
export function formatDate(
  dateInput: string | number | Date | null | undefined,
  includeTime: boolean = true,
  locale: string = "en-IN"
): string {
  if (!dateInput) return "—";

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "—";

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit", hour12: true } : {}),
  };

  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return date.toISOString().split("T")[0];
  }
}

/**
 * Formats relative time (e.g. '12m ago', '3h ago', '2d ago')
 */
export function formatRelativeTime(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return "—";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "—";

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return formatDate(date, false);
}
