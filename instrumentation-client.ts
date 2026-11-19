import * as Sentry from "@sentry/nextjs";

// Browser error monitoring. Does nothing until NEXT_PUBLIC_SENTRY_DSN is set.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: 0.05, sendDefaultPii: false, environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV });
}
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
