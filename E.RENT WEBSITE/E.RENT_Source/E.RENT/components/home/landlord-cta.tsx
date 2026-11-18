"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLandlordHref } from "@/components/layout/header-actions";

/** Goes to the right place for whoever is looking: sign-up as a landlord, Add a house, or the page that adds the landlord role. */
export function LandlordCta({ children = "Post a House", variant = "primary" }: { children?: React.ReactNode; variant?: "primary" | "secondary" }) {
  const href = useLandlordHref();
  return <Button asChild size="lg" variant={variant}><Link href={href}>{children}<ArrowRight className="size-5" aria-hidden /></Link></Button>;
}
