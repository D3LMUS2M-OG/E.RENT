import Link from "next/link";
import { getAccess } from "@/lib/auth";
import { DeleteAccount } from "@/components/account/delete-account";

export const metadata = { title: "Privacy and your data", robots: { index: false } };

export default async function PrivacyPage() {
  await getAccess("/account/privacy");
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <div><h1 className="text-4xl">Privacy and your data</h1><p className="mt-2 max-w-prose text-muted">Under the Data Protection Act, 2019 you can see, correct, take and delete your data. Here is how, in a few taps.</p></div>
      <ul className="space-y-2 text-[15px]">
        <li><b>See and correct:</b> your name, phone and picture are in <Link href="/account" className="text-link underline underline-offset-4">your account</Link>.</li>
        <li><b>Choose what we send you:</b> <Link href="/account/notifications" className="text-link underline underline-offset-4">notification settings</Link>.</li>
        <li><b>Read how we use your data:</b> <Link href="/legal/privacy" className="text-link underline underline-offset-4">Privacy policy</Link>. Questions? <Link href="/contact" className="text-link underline underline-offset-4">Contact us</Link>.</li></ul>
      <DeleteAccount />
    </div>
  );
}
