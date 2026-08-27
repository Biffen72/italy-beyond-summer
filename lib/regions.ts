export const REGIONS = ["lamezia-tropea", "reggio-locride", "cosenza-sila", "ciro"] as const;
export type Region = (typeof REGIONS)[number];

export const REGION_LABEL: Record<string, string> = {
  "lamezia-tropea": "Lamezia / Tropea",
  "reggio-locride": "Reggio / Locride",
  "cosenza-sila": "Cosenza / Sila",
  ciro: "Cirò",
};
