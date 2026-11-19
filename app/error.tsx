"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center gap-5 px-4 text-center">
      <h1 className="text-3xl">Something went wrong on our side</h1>
      <p className="text-muted">We have been told about it. Please try again. If it keeps happening, <Link href="/contact" className="text-link underline underline-offset-4">contact us</Link>{error.digest ? ` and quote ${error.digest}` : ""}.</p>
      <div className="flex gap-3"><Button size="lg" onClick={reset}>Try again</Button><Button asChild size="lg" variant="secondary"><Link href="/">Home</Link></Button></div>
    </div>
  );
}
