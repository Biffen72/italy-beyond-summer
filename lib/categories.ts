export type Category = {
  value: string;
  label: string;
  icon: string | null;
  image_url: string | null;
  show_on_homepage: boolean;
  sort_order: number;
};

export function categoryLabelMap(categories: { value: string; label: string }[]): Record<string, string> {
  return Object.fromEntries(categories.map((c) => [c.value, c.label]));
}
