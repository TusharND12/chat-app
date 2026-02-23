/**
 * Relative time: "5 minutes ago", "2 hours ago", "yesterday", etc.
 */
export function formatRelativeTime(ms: number): string {
  const now = Date.now();
  const diff = now - ms;
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (sec < 60) return "just now";
  if (min < 60) return `${min} minute${min !== 1 ? "s" : ""} ago`;
  if (hr < 24) return `${hr} hour${hr !== 1 ? "s" : ""} ago`;
  if (day === 1) return "yesterday";
  if (day < 7) return `${day} days ago`;
  return formatTimestamp(ms);
}

/** Short relative time for list: "2m", "1h", "Yesterday" */
export function formatShortTime(ms: number): string {
  const now = Date.now();
  const diff = now - ms;
  const min = Math.floor(diff / 60_000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  if (hr < 24) return `${hr}h`;
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day}d`;
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Day label for message separators: "Today", "Yesterday", "Monday, Jan 15" */
export function formatDayLabel(ms: number): string {
  const date = new Date(ms);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const isYesterday = (() => {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return (
      date.getDate() === y.getDate() &&
      date.getMonth() === y.getMonth() &&
      date.getFullYear() === y.getFullYear()
    );
  })();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/**
 * Smart timestamps:
 * - Today → time only (e.g. "2:30 PM")
 * - This year → date + time (e.g. "Jan 15, 2:30 PM")
 * - Older → date + year + time (e.g. "Dec 3, 2024, 2:30 PM")
 */
export function formatTimestamp(ms: number): string {
  const date = new Date(ms);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const isThisYear = date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    return timeStr;
  }

  const dateStr = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(isThisYear ? {} : { year: "numeric" }),
  });

  return `${dateStr}, ${timeStr}`;
}

/** Full datetime for tooltips: "Mon, Jan 15, 2024 at 2:30:45 PM" */
export function formatExactTimestamp(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}
