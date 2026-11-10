import type { Metadata } from "next";
import { getAccess } from "@/lib/auth";

export const metadata: Metadata = { title: "Organisation", robots: { index: false } };

export default async function OrgLayout({ children }: { children: React.ReactNode }) {
  await getAccess("/org");
  return <div className="mx-auto max-w-3xl px-4 py-12">{children}</div>;
}
