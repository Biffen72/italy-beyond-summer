import { createClient } from "@/lib/supabase/server";
import { TranslationsList } from "./TranslationsList";
import { groupByCategory } from "@/lib/groupByCategory";
import { setViewAs } from "./view-as/actions";

export default async function AdminTranslationsPage() {
  const supabase = await createClient();

  const { data: agencies } = await supabase.from("agencies").select("id, name").order("name");
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, name, category")
    .order("name");
  const groupedSuppliers = groupByCategory(suppliers ?? []);
  const guides = (suppliers ?? []).filter((s) => s.category === "Guide");

  // Includes both normal AI-translation review rows (pending_review) and
  // AI-authored source rows that were bulk-imported as candidates
  // (draft + translated_by=ai) — those never went through a supplier's
  // own "submit" action, so they'd otherwise never surface here. A real
  // supplier's own in-progress draft (translated_by=human) is excluded —
  // that's still their private work in progress.
  const { data: pending } = await supabase
    .from("supplier_translations")
    .select(
      "id, language, headline, description, price_includes, created_at, suppliers(name, category, address)"
    )
    .or("status.eq.pending_review,and(status.eq.draft,translated_by.eq.ai)")
    .order("created_at", { ascending: true });

  const translations = (pending ?? []).map((t) => ({
    id: t.id,
    language: t.language,
    headline: t.headline,
    description: t.description,
    price_includes: t.price_includes,
    supplier: t.suppliers as unknown as {
      name: string;
      category: string | null;
      address: string | null;
    } | null,
  }));

  return (
    <section className="px-6 py-10 md:px-12">
      <div className="border-b border-line pb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          View as
        </h2>
        <p className="mt-1 text-sm text-ink/60">
          See exactly what a customer or supplier sees. A banner at the top
          lets you exit back to backoffice at any time.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <form action={setViewAs} className="rounded-card border border-line bg-white p-4">
            <input type="hidden" name="type" value="agency" />
            <label className="block text-sm font-semibold text-ink">View as customer</label>
            <select
              name="id"
              required
              defaultValue=""
              className="mt-2 w-full rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
            >
              <option value="" disabled>
                Select a customer…
              </option>
              {(agencies ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="mt-3 w-full rounded-card bg-wine px-3 py-2 text-sm font-semibold text-paper transition hover:bg-wine-dark"
            >
              View →
            </button>
          </form>

          <form action={setViewAs} className="rounded-card border border-line bg-white p-4">
            <input type="hidden" name="type" value="supplier" />
            <label className="block text-sm font-semibold text-ink">View as supplier</label>
            <select
              name="id"
              required
              defaultValue=""
              className="mt-2 w-full rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
            >
              <option value="" disabled>
                Select a supplier…
              </option>
              {groupedSuppliers.map(([category, items]) => (
                <optgroup key={category} label={category}>
                  {items.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              type="submit"
              className="mt-3 w-full rounded-card bg-wine px-3 py-2 text-sm font-semibold text-paper transition hover:bg-wine-dark"
            >
              View →
            </button>
          </form>

          <form action={setViewAs} className="rounded-card border border-line bg-white p-4">
            <input type="hidden" name="type" value="supplier" />
            <label className="block text-sm font-semibold text-ink">View as guide</label>
            {guides.length === 0 ? (
              <p className="mt-2 text-xs text-ink/60">
                No suppliers are categorized as a Guide yet.
              </p>
            ) : (
              <>
                <select
                  name="id"
                  required
                  defaultValue=""
                  className="mt-2 w-full rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
                >
                  <option value="" disabled>
                    Select a guide…
                  </option>
                  {guides.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="mt-3 w-full rounded-card bg-wine px-3 py-2 text-sm font-semibold text-paper transition hover:bg-wine-dark"
                >
                  View →
                </button>
              </>
            )}
          </form>
        </div>
      </div>

      <h1 className="mt-8 text-2xl font-semibold text-ink">
        Translations pending approval
      </h1>
      <p className="mt-1 text-ink/60">
        AI-generated translations become visible to agencies only once
        they're approved here. This also includes AI-researched candidate
        suppliers that haven't been reviewed yet.
      </p>

      {translations.length === 0 ? (
        <p className="mt-8 text-ink/60">
          No translations are waiting for approval right now.
        </p>
      ) : (
        <TranslationsList translations={translations} />
      )}
    </section>
  );
}
