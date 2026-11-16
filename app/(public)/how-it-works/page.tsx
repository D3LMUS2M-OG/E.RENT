import type { Metadata } from "next";
import Link from "next/link";
import { Block, InfoPage } from "@/components/layout/info-page";

export const metadata: Metadata = { title: "How E.Rent works" };

export default function HowItWorksPage() {
  return (
    <InfoPage title="How E.Rent works" intro="Three steps for tenants, three for landlords. No money moves through the site.">
      <Block title="If you are looking for a house">
        <ol className="list-decimal space-y-2 pl-5"><li><b className="text-foreground">Search.</b> Choose a county, estate or house type and filter by rent, bedrooms and amenities. Use the map or Near me.</li><li><b className="text-foreground">Chat.</b> Create a free account, then ask the landlord your questions in a private chat. Your phone number stays hidden unless you share it.</li><li><b className="text-foreground">Request a viewing.</b> Visit in person. Only pay the landlord after you have seen the house and are happy. If you rent it, you can leave an honest review.</li></ol>
        <p><Link href="/search" className="font-semibold text-link underline underline-offset-4">Start searching</Link></p>
      </Block>
      <Block title="If you have a house to let" d={1}>
        <ol className="list-decimal space-y-2 pl-5"><li><b className="text-foreground">Create a landlord account</b> and upload your ID and proof of ownership to get the Verified badge.</li><li><b className="text-foreground">Add your house</b> with 3 to 7 photos, a short video and a pin on the map. Listings go live straight away.</li><li><b className="text-foreground">Answer tenants</b> in chat, accept viewing requests and mark the house rented. Listings last 90 days and you get reminders before they expire.</li></ol>
        <p><Link href="/for-landlords" className="font-semibold text-link underline underline-offset-4">For landlords</Link></p>
      </Block>
    </InfoPage>
  );
}
