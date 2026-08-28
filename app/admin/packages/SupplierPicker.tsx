"use client";

import { groupByCategory } from "@/lib/groupByCategory";
import { SupplierRatingBadge } from "@/components/SupplierRatingBadge";

type SupplierOption = {
  id: string;
  name: string;
  category: string;
  base_region: string;
  logo_url?: string | null;
  star_rating?: number | null;
  quality_rating?: number | null;
};

export function SupplierPicker({
  suppliers,
  selectedIds,
  onChange,
  region,
}: {
  suppliers: SupplierOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  region: string;
}) {
  const filtered = suppliers.filter((s) => s.base_region === region);
  const grouped = groupByCategory(filtered);
  const filteredIds = new Set(filtered.map((s) => s.id));
  const hiddenSelectedCount = selectedIds.filter((id) => !filteredIds.has(id)).length;

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  }

  return (
    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-ink">
        Included suppliers/activities ({selectedIds.length} selected)
      </label>
      {hiddenSelectedCount > 0 && (
        <p className="mt-1 text-xs text-ink/50">
          {hiddenSelectedCount} selected supplier{hiddenSelectedCount === 1 ? "" : "s"} not
          shown here (different region).
        </p>
      )}

      {!region ? (
        <p className="mt-2 text-sm text-ink/60">
          Choose a region above to see suppliers in that area.
        </p>
      ) : grouped.length === 0 ? (
        <p className="mt-2 text-sm text-ink/60">
          No active suppliers in this region yet.
        </p>
      ) : (
        <div className="mt-2 max-h-[32rem] space-y-5 overflow-y-auto rounded-card border border-line bg-paper p-3">
          {grouped.map(([category, items]) => (
            <div key={category}>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                {category}
              </p>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {items.map((s) => {
                  const included = selectedIds.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 rounded-card border p-3 ${
                        included ? "border-wine bg-wine/5" : "border-line bg-white"
                      }`}
                    >
                      {s.logo_url ? (
                        <img
                          src={s.logo_url}
                          alt=""
                          className="h-12 w-12 flex-shrink-0 rounded-card border border-line object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 flex-shrink-0 rounded-card border border-line bg-paper" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">
                          {s.name}
                          <SupplierRatingBadge
                            category={s.category}
                            starRating={s.star_rating}
                            qualityRating={s.quality_rating}
                          />
                        </p>
                        <a
                          href={`/admin/suppliers/${s.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-wine underline"
                        >
                          View profile ↗
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggle(s.id)}
                        className={`flex-shrink-0 rounded-card px-3 py-1.5 text-xs font-semibold transition ${
                          included
                            ? "bg-wine text-paper hover:bg-wine-dark"
                            : "border border-line text-ink hover:border-wine"
                        }`}
                      >
                        {included ? "Added" : "Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
