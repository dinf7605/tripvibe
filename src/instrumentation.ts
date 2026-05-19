// Next.js Instrumentation hook — runs once at server startup (Node + Edge runtimes).
// We delegate to per-runtime Sentry configs. If SENTRY_DSN is not set, Sentry.init
// becomes a no-op, so this stays safe in dev without credentials.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Forward server-side rendering errors to Sentry
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
  context: { routerKind: "Pages Router" | "App Router"; routePath: string; routeType: "render" | "route" | "action" | "middleware" }
) {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureRequestError(err, request, context);
  } catch {
    // Sentry not available — fall back to console
    console.error("[onRequestError]", err);
  }
}
