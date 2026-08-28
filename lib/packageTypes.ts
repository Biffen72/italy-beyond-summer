export const PACKAGE_TYPES = [
  "bryllup",
  "vingaarder",
  "mat-gourmet",
  "hiking",
  "opplevelsesreise",
  "firma",
] as const;
export type PackageType = (typeof PACKAGE_TYPES)[number];

export const PACKAGE_TYPE_LABEL: Record<string, string> = {
  bryllup: "Wedding",
  vingaarder: "Vineyards",
  "mat-gourmet": "Food & gourmet",
  hiking: "Hiking",
  opplevelsesreise: "Other experiences",
  firma: "Corporate",
};

// The theme boxes shown on the agency dashboard homepage, in display order.
export const PACKAGE_THEME_HOMEPAGE: { type: PackageType; label: string; icon: string }[] = [
  { type: "bryllup", label: "Wedding", icon: "💍" },
  { type: "vingaarder", label: "Vineyards", icon: "🍷" },
  { type: "mat-gourmet", label: "Food & gourmet", icon: "🍝" },
  { type: "hiking", label: "Hiking", icon: "🥾" },
];
