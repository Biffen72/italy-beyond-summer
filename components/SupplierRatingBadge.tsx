import { formatStars, formatThumbs } from "@/lib/stars";

// Hotels show their official star rating; every other category shows
// admin's 1-5 price/quality rating instead — the two never apply to the
// same supplier, so this picks whichever one is relevant and renders
// nothing when neither is set.
export function SupplierRatingBadge({
  category,
  starRating,
  qualityRating,
}: {
  category: string;
  starRating?: number | null;
  qualityRating?: number | null;
}) {
  if (category === "Hotel") {
    if (!starRating) return null;
    return <span className="ml-1 text-gold">{formatStars(starRating)}</span>;
  }

  if (!qualityRating) return null;
  return <span className="ml-1">{formatThumbs(qualityRating)}</span>;
}
