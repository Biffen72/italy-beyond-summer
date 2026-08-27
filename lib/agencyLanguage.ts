// Maps an agency's country to the translated-content language we show
// them. Falls back to English when the country isn't set or has no
// direct match — English is always one of the translated languages.
export function resolveAgencyLanguage(country: string | null | undefined): "no" | "sv" | "da" | "en" {
  if (country === "NO") return "no";
  if (country === "SE") return "sv";
  if (country === "DK") return "da";
  return "en";
}
