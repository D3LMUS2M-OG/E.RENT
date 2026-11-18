"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useSession } from "@/components/layout/session-provider";

/** Only for signed-in people: a way into their own feed. */
export function FeedLink() {
  const s = useSession();
  if (s.status !== "in") return null;
  return <Link href="/account/feed" className="motion-rise mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-border-strong bg-background/60 px-4 text-sm font-semibold backdrop-blur transition-transform hover:-translate-y-0.5"><Sparkles className="size-4 text-accent" aria-hidden />Houses picked for you<ArrowRight className="size-4" aria-hidden /></Link>;
}
