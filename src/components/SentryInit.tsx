"use client";

import { useEffect } from "react";

/**
 * Loads sentry.client.config on the browser. The config is gated on
 * NEXT_PUBLIC_SENTRY_DSN — if the env var is missing, Sentry stays dormant
 * and we pay zero runtime cost beyond this one dynamic import (which itself
 * is gated by NODE_ENV === "production").
 */
export default function SentryInit() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    // Dynamically import so dev bundles don't pay the cost
    import("../../sentry.client.config").catch(() => {
      // No-op: Sentry isn't critical to the app
    });
  }, []);
  return null;
}
