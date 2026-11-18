import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReviewCard } from "@/components/reviews/review-card";
import { ReplyForm } from "@/components/reviews/reply-form";
import { PUBLIC_REVIEW_COLUMNS, type PublicReview } from "@/lib/reviews";

export const metadata = { title: "Reviews" };

export default async function DashboardReviews() {
  await getAccess("/dashboard/reviews");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: mine } = await supabase.rpc("my_landlords");
  const ids = [user!.id, ...((mine ?? []) as { landlord_id: string }[]).map((l) => l.landlord_id)];
  const { data } = await supabase.from("public_reviews").select(PUBLIC_REVIEW_COLUMNS).in("landlord_id", ids).order("created_at", { ascending: false }).limit(100);
  const reviews = (data ?? []) as PublicReview[];
  const waiting = reviews.filter((r) => !r.reply_body).length;
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl">Reviews</h1><p className="mt-2 max-w-prose text-muted">Tenants who rented or viewed your houses can review them. Reviews are public and are not edited. Reply to thank people or give your side.{waiting > 0 && <> <b className="text-foreground">{waiting} {waiting === 1 ? "review is" : "reviews are"} waiting for a reply.</b></>}</p></div>
      {reviews.length === 0 ? <p className="rounded-[24px] border border-border bg-surface p-6 text-muted">No reviews yet. They appear here after a tenant confirms a rental or records a viewing.</p> : (
        <ul className="space-y-4">{reviews.map((r) => <li key={r.id}><ReviewCard r={r} showListing landlordName="You"><ReplyForm reviewId={r.id} existing={r.reply_body} /></ReviewCard></li>)}</ul>)}
    </div>
  );
}
