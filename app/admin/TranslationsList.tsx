"use client";

import { useState } from "react";
import { approveTranslation, rejectTranslation } from "./actions";

const LANGUAGE_LABEL: Record<string, string> = {
  it: "Italian",
  no: "Norwegian",
  sv: "Swedish",
  da: "Danish",
  en: "English",
};

type Translation = {
  id: string;
  language: string;
  headline: string | null;
  description: string | null;
  price_includes: string | null;
  supplier: {
    name: string;
    category: string | null;
    address: string | null;
  } | null;
};

export function TranslationsList({ translations }: { translations: Translation[] }) {
  const [query, setQuery] = useState("");

  const filtered = translations.filter((t) => {
    const haystack = `${t.supplier?.name ?? ""} ${t.supplier?.category ?? ""} ${t.headline ?? ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <div>
      <input
        type="text"
        placeholder="Search by supplier name or category…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mt-6 w-full max-w-sm rounded-card border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus-visible:border-wine"
      />

      {filtered.length === 0 ? (
        <p className="mt-8 text-ink/60">No translations match.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filtered.map((t) => (
            <article
              key={t.id}
              className="rounded-card border border-line bg-white p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-wine">
                {t.supplier?.name ?? "Unknown supplier"} · {LANGUAGE_LABEL[t.language] ?? t.language}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-ink">{t.headline}</h2>
              <p className="mt-1 text-xs text-ink/50">
                {t.supplier?.category}
                {t.supplier?.address ? ` · ${t.supplier.address}` : ""}
              </p>
              <p className="mt-3 text-sm text-ink/80">{t.description}</p>
              {t.price_includes && (
                <p className="mt-2 text-sm text-ink/60">Includes: {t.price_includes}</p>
              )}

              <div className="mt-5 flex gap-3">
                <form action={approveTranslation.bind(null, t.id)}>
                  <button
                    type="submit"
                    className="rounded-card bg-wine px-4 py-2 text-sm font-semibold text-paper transition hover:bg-wine-dark"
                  >
                    Approve
                  </button>
                </form>
                <form action={rejectTranslation.bind(null, t.id)}>
                  <button
                    type="submit"
                    className="rounded-card border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-wine"
                  >
                    Reject
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
