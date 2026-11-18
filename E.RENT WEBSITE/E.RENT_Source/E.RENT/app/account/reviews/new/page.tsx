import Link from "next/link";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReviewForm } from "@/components/reviews/review-form";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Write a review" };

type Reviewable = { request_id: string; kind: "rental" | "tour"; listing_slug: string; listing_title: string; reviewed: boolean; last_reviewed_at: string | null; can_review: boolean };

export default async function NewReviewPage({ searchParams }: { searchParams: Promise<{ request?: string }> }) {
  const { request } = await searchParams;
  await getAccess(`/account/reviews/new${request ? `?request=${request}` : ""}`);
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_reviewable");
  const item = ((data ?? []) as Reviewable[]).find((r) => r.request_id === request);
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      {!item ? (
        <><h1 className="text-3xl">Write a review</h1>
          <p className="text-muted">You can review a house after the landlord has confirmed your rental, or after you have marked a viewing as done. Open My requests to see what you can review.</p>
          <Button asChild><Link href="/account/requests">Go to My requests</Link></Button></>
      ) : item.reviewed && !item.can_review ? (
        <><h1 className="text-3xl">Your review is posted</h1><p className="text-muted">You can post an update on {new Date(new Date(item.last_reviewed_at!).getTime() + 7 * 864e5).toLocaleDateString("en-KE", { day: "numeric", month: "long" })}, for example after the landlord fixes something.</p>
          <Button asChild><Link href={`/listing/${item.listing_slug}#reviews`}>See the reviews</Link></Button></>
      ) : (
        <><div><h1 className="text-3xl">{item.reviewed ? "Post an update" : item.kind === "rental" ? "Review your home" : "Review your viewing"}</h1><p className="mt-2 text-muted">{item.listing_title}</p></div>
          <ReviewForm requestId={item.request_id} kind={item.kind} listingTitle={item.listing_title} listingSlug={item.listing_slug} isUpdate={item.reviewed} /></>
      )}
    </div>
  );
}
