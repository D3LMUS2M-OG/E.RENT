import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReviewCard } from "@/components/reviews/review-card";
import { RemoveReviewForm } from "@/components/admin/remove-review-form";
import { PUBLIC_REVIEW_COLUMNS, type PublicReview } from "@/lib/reviews";

export const metadata = { title: "Reviews" };

export default async function AdminReviews() {
  await getAccess("/admin/reviews");
  const supabase = await createClient();
  const { data } = await supabase.from("public_reviews").select(PUBLIC_REVIEW_COLUMNS).order("created_at", { ascending: false }).limit(100);
  const reviews = (data ?? []) as PublicReview[];
  return (
    <div className="space-y-5">
      <div><h1 className="text-3xl">Reviews</h1><p className="mt-1 max-w-prose text-muted">Reviews are not checked before they appear. Remove one only when you hold proof of defamation or abuse, and write that proof down: it goes into the audit log.</p></div>
      {reviews.length === 0 ? <p className="text-muted">No reviews yet.</p> : <ul className="space-y-4">{reviews.map((r) => <li key={r.id}><ReviewCard r={r} showListing><RemoveReviewForm id={r.id} /></ReviewCard></li>)}</ul>}
    </div>
  );
}
