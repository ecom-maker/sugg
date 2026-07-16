"use client";

import { useEffect, useState } from "react";

const DEFAULT_OPTS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
};

/**
 * Renders a timestamp in the viewer's local timezone. Server output is forced
 * to UTC (deterministic) to match first client render, then swapped to local
 * after mount — so times show correctly regardless of where the server runs.
 */
export function LocalDateTime({
  value,
  options,
}: {
  value: string | number | Date;
  options?: Intl.DateTimeFormatOptions;
}) {
  const opts = options ?? DEFAULT_OPTS;
  const [text, setText] = useState(() =>
    new Date(value).toLocaleString("en-IN", { ...opts, timeZone: "UTC" })
  );
  useEffect(() => {
    setText(new Date(value).toLocaleString(undefined, opts));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeof value === "object" ? +value : value]);
  return <span suppressHydrationWarning>{text}</span>;
}
