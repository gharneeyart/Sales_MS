const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats a naira amount (major units) as ₦1,500.50 */
export function formatNaira(amountInNaira: number): string {
  return nairaFormatter.format(amountInNaira).replace("NGN", "₦");
}

/** Formats an integer kobo amount (the storage unit, per A.4) as ₦1,500.50 */
export function formatKobo(amountInKobo: number): string {
  return formatNaira(amountInKobo / 100);
}

export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

/** Compact axis/tick label — "₦25,000" or "₦1.2M", no decimals. For chart chrome, not real values. */
export function formatKoboCompact(amountInKobo: number): string {
  const naira = amountInKobo / 100;
  if (Math.abs(naira) >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1)}M`;
  if (Math.abs(naira) >= 1_000) return `₦${Math.round(naira / 1000)}K`;
  return `₦${Math.round(naira)}`;
}

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-NG", {
  hour: "numeric",
  minute: "2-digit",
});

/** Friendly date: "Today, 3:45 PM", "Yesterday", or "13 Aug 2026" */
export function formatDate(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const now = new Date();
  const isSameDay = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isSameDay) return `Today, ${timeFormatter.format(date)}`;
  if (isYesterday) return `Yesterday, ${timeFormatter.format(date)}`;
  return dateFormatter.format(date);
}
