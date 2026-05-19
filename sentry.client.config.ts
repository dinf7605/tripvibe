// Sentry config — browser runtime.
// Activates only when NEXT_PUBLIC_SENTRY_DSN is provided. Without a DSN this
// file is harmless (Sentry.init does nothing).
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Cap on how much to sample for performance traces (10% is the typical default)
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    // Don't spam Sentry in development unless we explicitly want it
    enabled: process.env.NODE_ENV === "production",
    // Filter out noisy / expected browser errors
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications.",
      "Network request failed",
      "AbortError",
      "Non-Error promise rejection captured",
    ],
  });
}
