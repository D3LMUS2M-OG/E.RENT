"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Last-resort page when even the main layout fails. Keeps its own plain styling.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <html lang="en"><body style={{ fontFamily: "system-ui, sans-serif", background: "#111", color: "#fff", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0, padding: 24, textAlign: "center" }}>
      <div><h1 style={{ fontSize: 28 }}>E.Rent hit a problem</h1><p style={{ color: "#bbb" }}>We have been told about it. Please try again.</p>
        <button onClick={reset} style={{ marginTop: 16, padding: "12px 24px", borderRadius: 999, border: 0, background: "#ff4d00", color: "#111", fontWeight: 700, fontSize: 16 }}>Try again</button></div>
    </body></html>
  );
}
