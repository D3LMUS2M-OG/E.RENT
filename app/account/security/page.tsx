import { getAccess } from "@/lib/auth";
import { safeNextPath } from "@/lib/auth-flow";
import { MfaManager } from "@/components/security/mfa-manager";

export const metadata = { title: "Two-step sign-in", robots: { index: false } };

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  await getAccess("/account/security");
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <div><h1 className="text-4xl">Two-step sign-in</h1><p className="mt-2 max-w-prose text-muted">An extra code when you sign in, from an app on your phone.</p></div>
      <MfaManager next={next ? safeNextPath(next, "") : ""} />
    </div>
  );
}
