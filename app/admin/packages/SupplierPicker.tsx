"use client";

import { useState } from "react";
import { groupByCategory } from "@/lib/groupByCategory";
import { SupplierRatingBadge } from "@/components/SupplierRatingBadge";

type SupplierOption = {
  id: string;
  name: string;
  category: string;
  star_rating?: number | null;
  quality_rating?: number | null;
};

export function SupplierPicker({
  suppliers,
  selectedIds,
  onChange,
}: {
  suppliers: SupplierOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.category.toLowerCase().includes(query.toLowerCase())
  );
  const grouped = groupByCategory(filtered);

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
      <input
        type="text"
        placeholder="Search suppliers…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mt-1 w-full rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
      />
      <div className="mt-2 max-h-64 overflow-y-auto rounded-card border border-line bg-paper p-2">
        {grouped.length === 0 ? (
          <p className="p-2 text-sm text-ink/50">No suppliers match.</p>
        ) : (
          grouped.map(([category, items]) => (
            <div key={category} className="mb-2">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-ink/50">
                {category}
              </p>
              {items.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-white"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(s.id)}
                    onChange={() => toggle(s.id)}
                  />
                  <span className="text-ink">
                    {s.name}
                    <SupplierRatingBadge
                      category={s.category}
                      starRating={s.star_rating}
                      qualityRating={s.quality_rating}
                    />
                  </span>
                </label>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
