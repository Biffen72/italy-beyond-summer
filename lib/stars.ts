// Renders a hotel's star rating as a compact "★★★" string next to its
// name — returns "" when unrated so callers can splice it in without an
// extra null check at every call site.
export function formatStars(rating: number | null | undefined): string {
  if (!rating) return "";
  return "★".repeat(rating);
}

// Renders the admin's 1-5 price/quality rating for every non-Hotel
// supplier (hotels use their official star rating instead) as a compact
// "👍👍👍" string.
export function formatThumbs(rating: number | null | undefined): string {
  if (!rating) return "";
  return "👍".repeat(rating);
}
