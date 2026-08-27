import Anthropic from "@anthropic-ai/sdk";

// Server-only — translates a supplier's source-language profile text into
// the platform's agency-facing languages. Never import this from a
// "use client" file; ANTHROPIC_API_KEY must stay on the server.
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Suppliers can write in any of these (Italian included, since most
// suppliers are Italian) …
export const SOURCE_LANGUAGES = ["it", "no", "sv", "da", "en"] as const;
export type SourceLanguage = (typeof SOURCE_LANGUAGES)[number];

// … but agencies only ever see these four. Italian is source-only.
export const TARGET_LANGUAGES = ["no", "sv", "da", "en"] as const;
export type TargetLanguage = (typeof TARGET_LANGUAGES)[number];

const LANGUAGE_NAMES: Record<SourceLanguage, string> = {
  it: "Italian",
  no: "Norwegian",
  sv: "Swedish",
  da: "Danish",
  en: "English",
};

type SourceProfile = {
  language: SourceLanguage;
  headline: string | null;
  description: string | null;
  price_includes: string | null;
};

type TranslatedProfile = {
  language: TargetLanguage;
  headline: string;
  description: string;
  price_includes: string;
};

export async function translateSupplierProfile(
  source: SourceProfile
): Promise<TranslatedProfile[]> {
  const targets = TARGET_LANGUAGES.filter(
    (language): language is TargetLanguage => language !== source.language
  );

  return Promise.all(
    targets.map(async (target) => {
      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: `You translate travel-supplier profile text from ${LANGUAGE_NAMES[source.language]} into ${LANGUAGE_NAMES[target]} for a Scandinavian travel agency audience. Keep the tone warm and professional, matching a boutique travel brand. Respond with ONLY a JSON object with the keys "headline", "description", "price_includes" — no markdown, no commentary, no code fences.`,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              headline: source.headline ?? "",
              description: source.description ?? "",
              price_includes: source.price_includes ?? "",
            }),
          },
        ],
      });

      const text = message.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      let parsed: { headline?: string; description?: string; price_includes?: string };
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(`Translation to ${target} returned invalid JSON`);
      }

      return {
        language: target,
        headline: parsed.headline ?? "",
        description: parsed.description ?? "",
        price_includes: parsed.price_includes ?? "",
      };
    })
  );
}
