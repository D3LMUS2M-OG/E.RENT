import type { Metadata } from "next";
import { BadgeCheck, Camera, MessageCircle, Users } from "lucide-react";
import { Block, InfoPage } from "@/components/layout/info-page";
import { BecomeLandlord } from "@/components/home/become-landlord";

export const metadata: Metadata = { title: "For landlords and caretakers" };

export default function ForLandlordsPage() {
  return (
    <InfoPage title="For landlords and caretakers" intro="List a house in under 10 minutes, reach tenants across Kenya and build a reputation people can check.">
      <Block title="What you get">
        <ul className="space-y-3">{[[BadgeCheck, "A Verified badge", "Upload your ID and proof of ownership once. The blue badge shows on your profile, listings and chats."], [Camera, "Listings that go live at once", "Add 3 to 7 photos, a short video and a map pin. Manage many units in one building."], [MessageCircle, "Private chat with tenants", "Answer questions before viewings so only serious tenants visit."], [Users, "Caretakers and agents", "Invite a caretaker to post for you. You approve every listing and can take it down any time."]].map(([I, t, d]) => { const Icon = I as typeof BadgeCheck; return <li key={t as string} className="flex gap-3"><Icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden /><span><b className="text-foreground">{t as string}</b><br />{d as string}</span></li>; })}</ul>
      </Block>
      <Block title="Get started" d={1}><p>Free to list. No money moves through E.Rent: you agree rent directly with your tenant.</p><BecomeLandlord /></Block>
    </InfoPage>
  );
}
