export const PACKAGE_TYPES = ["opplevelsesreise", "firma", "bryllup"] as const;
export type PackageType = (typeof PACKAGE_TYPES)[number];

export const PACKAGE_TYPE_LABEL: Record<string, string> = {
  opplevelsesreise: "Experience",
  firma: "Corporate",
  bryllup: "Wedding",
};
