import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, GraduationCap, MapPinned, MessageCircle, Search, ShieldCheck, Star, Building2, KeyRound, Home as HomeIcon, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { ListingCard, toCard } from "@/components/listings/listing-card";
import { Reveal, CountUp } from "@/components/home/reveal";
import { Carousel } from "@/components/home/carousel";
import { CountyMap } from "@/components/home/county-map";
import { Stars } from "@/components/reviews/stars";
import { Faq } from "@/components/home/faq";
import { FeedLink } from "@/components/home/feed-link";
import { HeroSlideshow } from "@/components/home/hero-slideshow";
import { HeroHeadline } from "@/components/home/hero-headline";
import { LandlordCta } from "@/components/home/landlord-cta";
import { COUNTIES } from "@/lib/counties";
import { searchListings } from "@/lib/search";
import { getHomeData } from "@/lib/home-data";

export const revalidate = 300;

const POPULAR = ["nairobi", "kakamega", "kisumu", "nakuru", "mombasa", "kiambu", "uasin-gishu", "machakos", "kisii", "meru"];
const card = "rounded-[28px] border border-border bg-surface p-6";

const WHY = [
  { icon: BadgeCheck, title: "Verified landlords", text: "Landlords upload their ID and proof of ownership. Verified ones carry a blue badge on every listing and chat." },
  { icon: Star, title: "Honest tenant reviews", text: "Only tenants who really rented or toured a house can review it: water, security, the landlord. They appear here as the site grows." },
  { icon: Wallet, title: "No money through the site", text: "You agree rent with the landlord directly. E.Rent never collects deposits or rent, and it is free to browse and chat." },
  { icon: MessageCircle, title: "Chat before you travel", text: "Ask the landlord your questions in a private chat. Your phone number stays hidden until you choose to share it." },
];

const STEPS = [
  { icon: Search, title: "Search your county", text: "Pick a county, estate or house type. Filter by rent, bedrooms, water, parking and more." },
  { icon: MessageCircle, title: "Chat with the landlord", text: "Ask about the water, the security and the neighbours. Send photos or a voice note." },
  { icon: KeyRound, title: "View, then decide", text: "Request a viewing and visit in person. Agree the details with the landlord once you are happy." },
];

const FAQ = [
  { q: "Do I pay anything on E.Rent?", a: "No money moves through E.Rent. Browsing, chatting and listing are free today. You agree rent directly with the landlord. If paid options such as featured listings arrive later, they will be optional, and there will never be advertising." },
  { q: "How are landlords verified?", a: "A landlord uploads their National ID and proof of ownership such as a title deed, lease or utility bill. Our team checks them and, once approved, a blue Verified badge appears on their profile, listings and chats. Documents are stored privately." },
  { q: "How do I avoid scams?", a: "Never pay a deposit or rent before you have viewed the house in person. Be careful if someone rushes you or asks you to move the chat off the site. Use the Report button on any listing or chat, and read our safety tips." },
  { q: "What about the deposit?", a: "The deposit is agreed between you and the landlord and is paid outside E.Rent, after you have viewed the house and are happy with it. E.Rent is not a party to the rental agreement." },
  { q: "Who can write a review?", a: "Only tenants who rented through E.Rent, or who completed a viewing, can review a house and its landlord. Landlords can reply publicly. Reviews are not edited by us." },
  { q: "Are my chats private? Can I delete them?", a: "Chats are private between you and the landlord. Either of you can delete a conversation at any time, and chats are removed automatically after 30 days. If a chat is reported, the reported messages are kept for our team to review." },
  { q: "Can a caretaker or agent post for a landlord?", a: "Yes. A caretaker or agent can post on a landlord's behalf, but the landlord must approve the listing and can take it down at any time. The listing shows that it is managed by a caretaker or agent." },
  { q: "Which counties are covered?", a: "All 47. Some counties have more houses than others today, and more landlords join every week. If your county is quiet, set a saved search and we will tell you when a house appears." },
];

export default async function HomePage() {
  const [newest, home] = await Promise.all([searchListings({ limit: 8 }), getHomeData()]);
  const live = newest[0]?.total_count ?? 0;
  const popular = POPULAR.map((s) => COUNTIES.find((c) => c.slug === s)!).filter(Boolean);
  const stats: [number, string][] = [[47, "counties covered"], ...(live > 0 ? [[Number(live), live === 1 ? "house listed now" : "houses listed now"] as [number, string]] : []), ...(home.verifiedCount > 0 ? [[home.verifiedCount, home.verifiedCount === 1 ? "verified landlord" : "verified landlords"] as [number, string]] : [])];

  return (
    <div className="overflow-x-clip">
      {/* ───────── Hero: Kenyan homes cross-fading on the right, the words on the left ───────── */}
      <section className="hero hero-bg -mt-[var(--header-space)] pt-[calc(var(--header-space)+1.5rem)]">
        <div className="hero-scrim" aria-hidden />
        <div className="hero-content mx-auto w-full max-w-6xl px-4 pb-10 pt-6 lg:pb-32 lg:pt-12">
          <div className="max-w-xl">
            <p className="motion-rise inline-flex items-center gap-2 rounded-full border border-border-strong bg-background/70 px-3.5 py-1.5 text-sm font-semibold backdrop-blur"><ShieldCheck className="size-4 text-link" aria-hidden />All 47 counties · Free for tenants</p>
            <HeroHeadline lead="Find your next home in Kenya," accent="minus the guesswork." className="mt-5 text-[clamp(2.6rem,6vw,4.6rem)] leading-[1.02]" />
            <p className="motion-rise mt-5 max-w-xl text-lg text-muted" style={{ animationDelay: "700ms" }}>Find a verified house to rent in any of Kenya&rsquo;s 47 counties. Chat with the landlord before you travel, and read what past tenants say about the water, the security and the landlord.</p>
            <form action="/search" role="search" className="motion-rise glass glass-frost glass-pill mt-8 flex max-w-xl items-center gap-2 p-1.5 pl-5" style={{ animationDelay: "820ms" }}>
              <Search className="size-5 shrink-0 text-muted" aria-hidden />
              <label htmlFor="q" className="sr-only">Search by county, estate or words</label>
              <input id="q" name="q" placeholder="Search a county, estate or house type" className="min-h-11 min-w-0 flex-1 bg-transparent text-base placeholder:text-muted focus:outline-none" />
              <Button type="submit" size="lg">Search</Button>
            </form>
            <FeedLink />
          </div>
        </div>
        <HeroSlideshow />
      </section>

      <div className="mx-auto max-w-6xl space-y-24 px-4 pb-8 pt-4">
        {/* ───────── Trust strip: real numbers only ───────── */}
        <Reveal><ul className="grid grid-cols-2 gap-3 sm:flex sm:justify-center sm:gap-4">
          {stats.map(([n, l]) => (
            <li key={l} className="flex-1 rounded-[24px] border border-border bg-surface px-5 py-4 text-center sm:max-w-56"><CountUp to={n} className="block text-4xl font-semibold tracking-tight text-accent" /><span className="text-sm text-muted">{l}</span></li>))}
          <li className="flex-1 rounded-[24px] border border-border bg-surface px-5 py-4 text-center sm:max-w-56"><span className="block text-4xl font-semibold tracking-tight text-accent">KES 0</span><span className="text-sm text-muted">to browse and chat</span></li>
        </ul></Reveal>

        {/* ───────── Why rent with E.Rent ───────── */}
        <section aria-labelledby="why">
          <Reveal><h2 id="why" className="text-center text-4xl">Why rent with E.Rent</h2><p className="mx-auto mt-3 max-w-xl text-center text-muted">A calmer way to find a house: people you can check, answers before you travel, and nobody asking for money first.</p></Reveal>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map((w, i) => (
              <Reveal as="li" key={w.title} d={i}><div className={`${card} group h-full transition-[transform,border-color] duration-500 ease-[cubic-bezier(.34,1.56,.64,1)] hover:-translate-y-1.5 hover:border-primary/60`}>
                <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-accent transition-transform duration-500 ease-[cubic-bezier(.34,1.56,.64,1)] group-hover:rotate-[-8deg] group-hover:scale-110"><w.icon className="size-6" aria-hidden /></span>
                <h3 className="mt-4 text-lg font-semibold">{w.title}</h3><p className="mt-2 text-[15px] leading-relaxed text-muted">{w.text}</p></div></Reveal>))}
          </ul>
        </section>

        {/* ───────── Browse by county ───────── */}
        <section aria-labelledby="counties" className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <h2 id="counties" className="text-4xl">Browse by county</h2>
            <p className="mt-3 max-w-md text-muted">Tap or hover a county on the map to see its houses.</p>
            <ul className="marquee-chips mt-6 flex flex-wrap gap-2">
              {popular.map((c) => <li key={c.slug}><Link href={`/houses-for-rent/${c.slug}`} className="inline-flex min-h-11 items-center rounded-full border border-border-strong px-4 text-[15px] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-surface-2">{c.name}</Link></li>)}
            </ul>
            <Button asChild variant="secondary" className="mt-6"><Link href="/counties"><MapPinned className="size-5" aria-hidden />All 47 counties</Link></Button>
          </Reveal>
          <Reveal d={1}><div className={`${card} p-4 sm:p-8`}><CountyMap /></div></Reveal>
        </section>

        {/* ───────── Newest listings ───────── */}
        <section aria-labelledby="newest">
          <Reveal className="flex items-end justify-between gap-4"><div><h2 id="newest" className="text-4xl">Newest listings</h2><p className="mt-2 text-muted">Fresh from landlords and caretakers.</p></div>
            {newest.length > 0 && <Link href="/search" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent">See all<ArrowRight className="size-4" aria-hidden /></Link>}</Reveal>
          {newest.length === 0 ? (
            <Reveal><div className={`${card} mt-8 flex flex-col items-center gap-4 text-center`}><HomeIcon className="size-8 text-accent" aria-hidden /><p className="max-w-md text-muted">No houses have been published yet. Landlords and caretakers can add the first ones in a few minutes.</p><LandlordCta variant="secondary">Post a House</LandlordCta></div></Reveal>
          ) : (
            <div className="mt-8"><Carousel label="Newest listings">{newest.map((r) => <ListingCard key={r.id} listing={toCard(r)} />)}</Carousel></div>
          )}
        </section>

        {/* ───────── How it works ───────── */}
        <section aria-labelledby="how">
          <Reveal><h2 id="how" className="text-center text-4xl">How it works</h2></Reveal>
          <ol className="relative mt-10 grid gap-4 md:grid-cols-3">
            <span aria-hidden className="pointer-events-none absolute left-[16%] right-[16%] top-14 hidden h-px bg-gradient-to-r from-transparent via-border-strong to-transparent md:block" />
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.title} d={i * 2}><div className={`${card} relative h-full text-center`}>
                <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-primary)]"><s.icon className="size-7" aria-hidden /></span>
                <span className="absolute right-5 top-4 font-serif text-5xl font-bold text-foreground/10" aria-hidden>{i + 1}</span>
                <h3 className="mt-5 text-xl font-semibold">{s.title}</h3><p className="mt-2 text-[15px] leading-relaxed text-muted">{s.text}</p></div></Reveal>))}
          </ol>
        </section>

        {/* ───────── Student housing ───────── */}
        <Reveal as="section"><div className="grid overflow-hidden rounded-[36px] border border-border bg-surface md:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4 p-8 sm:p-12">
            <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-accent"><GraduationCap className="size-6" aria-hidden /></span>
            <h2 className="text-4xl">Student housing, sorted.</h2>
            <p className="max-w-md text-muted">Hostels, bedsitters and shared rooms close to campus. Check the landlord is verified, chat about the rules and the water, then go and see it.</p>
            <Button asChild size="lg"><Link href="/student-housing">Find housing near your campus<ArrowRight className="size-5" aria-hidden /></Link></Button>
          </div>
          <div className="relative min-h-64"><Image src="/landing/student-1.webp" alt="A modern student residence with a green courtyard and picnic tables" fill sizes="(min-width:768px) 40vw, 100vw" className="object-cover object-center" /></div>
        </div></Reveal>

        {/* ───────── Verified landlords ───────── */}
        <section aria-labelledby="landlords">
          <Reveal><h2 id="landlords" className="text-center text-4xl">Meet our verified landlords</h2><p className="mx-auto mt-3 max-w-xl text-center text-muted">Real people who have shown their ID and proof of ownership. Star ratings appear here as tenants review them.</p></Reveal>
          {home.landlords.length === 0 ? (
            <Reveal><div className={`${card} mx-auto mt-8 max-w-xl text-center`}><BadgeCheck className="mx-auto size-8 text-link" aria-hidden /><p className="mt-3 text-muted">Verified landlords will appear here as soon as the first ones are approved.</p></div></Reveal>
          ) : (
            <div className="mt-8"><Carousel label="Verified landlords" itemClass="w-[62%] sm:w-[30%] lg:w-[22%]">
              {home.landlords.map((l) => (
                <Link key={l.id} href={`/landlord/${l.id}`} className={`${card} flex flex-col items-center gap-3 text-center transition-[transform,border-color] duration-500 ease-[cubic-bezier(.34,1.56,.64,1)] hover:-translate-y-1.5 hover:border-primary/60`}>
                  <Avatar name={l.name} path={l.avatar} className="size-20 text-xl" /><p className="font-semibold">{l.name}</p><VerifiedBadge />
                  {l.rating ? <p className="flex items-center gap-1.5 text-sm"><Stars value={l.rating} /><b>{l.rating.toFixed(1)}</b><span className="text-muted">({l.reviews})</span></p> : <p className="text-sm text-muted">On E.Rent since {l.since}</p>}</Link>))}
            </Carousel></div>
          )}
        </section>

        {/* ───────── Walkthrough videos: shown only once landlords have added some ───────── */}
        {home.videos.length > 0 && (
          <section aria-labelledby="walk">
            <Reveal><h2 id="walk" className="text-4xl">See inside before you go</h2><p className="mt-2 max-w-xl text-muted">Short walkthrough videos from landlords.</p></Reveal>
            <div className="mt-8"><Carousel label="Walkthrough videos" itemClass="w-[70%] sm:w-[36%] lg:w-[24%]">
              {home.videos.map((v) => (
                <div key={v.src} className="space-y-2"><video src={v.src} controls playsInline preload="metadata" aria-label={`Walkthrough of ${v.title}`} className="aspect-[9/14] w-full rounded-[24px] bg-surface-2 object-cover" />
                  <Link href={`/listing/${v.slug}`} className="line-clamp-1 text-sm font-semibold underline-offset-4 hover:underline">{v.title}</Link></div>))}
            </Carousel></div>
          </section>)}

        {/* ───────── For landlords ───────── */}
        <Reveal as="section"><div className="relative overflow-hidden rounded-[36px] bg-primary p-8 text-primary-foreground sm:p-14">
          <Building2 aria-hidden className="float-slow absolute -right-6 -top-6 size-56 text-black/10" />
          <h2 className="relative max-w-xl text-4xl text-primary-foreground">Have a house to let? Post it in minutes.</h2>
          <p className="relative mt-3 max-w-lg text-[17px] text-primary-foreground/85">Reach serious tenants in every county, answer them in chat and get a Verified badge. Free to list. Caretakers and agents are welcome too.</p>
          <div className="relative mt-7 flex flex-wrap gap-3"><LandlordCta variant="secondary">Post a House</LandlordCta><Button asChild size="lg" variant="ghost" className="text-primary-foreground hover:bg-black/10"><Link href="/how-it-works">How E.Rent works</Link></Button></div>
        </div></Reveal>

        {/* ───────── FAQ ───────── */}
        <section aria-labelledby="faq" className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <Reveal><h2 id="faq" className="text-4xl">Questions, answered</h2><p className="mt-3 text-muted">Still unsure? <Link href="/contact" className="font-semibold text-link underline underline-offset-4">Talk to us</Link>.</p></Reveal>
          <Reveal d={1}><Faq items={FAQ} /></Reveal>
        </section>

        {/* ───────── Final call ───────── */}
        <Reveal as="section"><div className="rounded-[36px] border border-border bg-surface p-8 text-center sm:p-14">
          <h2 className="mx-auto max-w-2xl text-4xl sm:text-5xl">Your next home is one search away.</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3"><Button asChild size="lg"><Link href="/search">Find a House<ArrowRight className="size-5" aria-hidden /></Link></Button><LandlordCta variant="secondary">Post a House</LandlordCta></div>
        </div></Reveal>
      </div>
    </div>
  );
}
