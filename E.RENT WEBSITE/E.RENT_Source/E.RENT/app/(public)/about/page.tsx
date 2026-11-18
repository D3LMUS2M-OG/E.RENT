import type { Metadata } from "next";
import { Block, InfoPage } from "@/components/layout/info-page";

export const metadata: Metadata = { title: "About E.Rent" };

export default function AboutPage() {
  return (
    <InfoPage title="About E.Rent" intro="E stands for easy and electronic. E.Rent is a Kenya-wide place to find a house to rent, talk to the landlord first, and learn from tenants who lived there before you.">
      <Block title="Why we built it">
        <p>Finding a house in a new area usually means social media posts, brokers and wasted trips to houses that do not match the advert. Many listings are old or fake, and there is no way to know what a landlord is really like.</p>
        <p>E.Rent puts every house in one place, in all 47 counties, with a real map pin, a verified landlord where possible, and a private chat behind each listing.</p>
      </Block>
      <Block title="What we do and do not do" d={1}>
        <p>Landlords, agents and caretakers list their own houses. Tenants search, chat and request viewings. Reviews come only from people who rented or toured the house.</p>
        <p>No money moves through E.Rent. You agree and pay rent directly with the landlord, after viewing the house. E.Rent is not a party to any rental agreement.</p>
      </Block>
    </InfoPage>
  );
}
