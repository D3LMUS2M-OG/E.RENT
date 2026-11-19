import * as Sentry from "@sentry/nextjs";

/** Error monitoring. Does nothing until SENTRY_DSN is set. No personal data is sent by default. */
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1, sendDefaultPii: false, environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV });
}

export const onRequestError = Sentry.captureRequestError;
