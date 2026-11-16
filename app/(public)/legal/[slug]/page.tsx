import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Block, InfoPage } from "@/components/layout/info-page";

const DOCS: Record<string, { title: string; points: string[] }> = {
  terms: { title: "Terms of service", points: ["E.Rent is a listing and messaging platform. We are not a party to any rental agreement between landlords and tenants.", "Landlords, agents and caretakers must have the right to let the houses they list, and listings must be accurate.", "Photos must show the house only. No faces, phone numbers or personal information.", "We can remove listings, warn, suspend or ban accounts that break these terms."] },
  privacy: { title: "Privacy policy", points: ["We follow the Kenya Data Protection Act, 2019.", "Identity documents are stored privately, shown only to our verification team and deleted on request or after a retention period.", "Chats are deleted after 30 days. Reported chats are copied for our team to review.", "Our services run on Supabase and Vercel, so data may be processed outside Kenya.", "You can ask to see, correct or delete your data at any time."] },
  cookies: { title: "Cookie notice", points: ["We use small files to keep you signed in, remember your theme and make the site faster.", "We do not show advertising and we do not sell your data."] },
  "community-standards": { title: "Community and listing standards", points: ["Be honest: real houses, real prices, real photos.", "No harassment, discrimination, threats or scams.", "One listing per unit type. Duplicate listings are flagged and removed."] },
  "review-policy": { title: "Review policy", points: ["Only tenants with a confirmed rental or a completed viewing can review.", "Reviews are not edited before publishing. We remove a review only with proof of defamation or abuse.", "Landlords may reply publicly."] },
  "acceptable-use": { title: "Acceptable use and chat conduct", points: ["Do not ask for money before a viewing.", "Do not send abusive, sexual or threatening messages.", "Do not use the platform to collect personal data or to spam."] },
  disclaimer: { title: "Disclaimer", points: ["E.Rent is not a party to any rental agreement and does not collect rent or deposits.", "Always view a house in person before paying anything."] },
};

export function generateStaticParams() { return Object.keys(DOCS).map((slug) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const d = DOCS[(await params).slug]; return { title: d?.title ?? "Legal" }; }

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const d = DOCS[(await params).slug]; if (!d) notFound();
  return (
    <InfoPage title={d.title} intro="Draft summary. The full wording is being reviewed by our legal counsel and will replace this page.">
      <Block title="The key points"><ul className="list-disc space-y-2 pl-5">{d.points.map((p) => <li key={p}>{p}</li>)}</ul></Block>
    </InfoPage>
  );
}
