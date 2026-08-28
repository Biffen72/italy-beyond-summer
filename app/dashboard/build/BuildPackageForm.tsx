"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { groupByCategory } from "@/lib/groupByCategory";
import { REGIONS, REGION_LABEL } from "@/lib/regions";
import { computePackageTotalEur, formatPackagePrice } from "@/lib/pricing";
import { SupplierRatingBadge } from "@/components/SupplierRatingBadge";
import { submitCustomPackageRequest } from "./actions";

type SupplierOption = {
  id: string;
  name: string;
  category: string;
  star_rating: number | null;
  quality_rating: number | null;
  logo_url: string | null;
};

export function BuildPackageForm({
  agencyCountry,
  readOnly = false,
}: {
  agencyCountry: string | null;
  readOnly?: boolean;
}) {
  const supabase = createClient();

  const [baseRegion, setBaseRegion] = useState("");
  const nights = "7";
  const [travelMonth, setTravelMonth] = useState("");
  const [groupSize, setGroupSize] = useState("");
  const [singleRoom, setSingleRoom] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [priceEstimate, setPriceEstimate] = useState<string | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!baseRegion) {
      setSuppliers([]);
      setSelectedIds([]);
      return;
    }
    setLoadingSuppliers(true);
    setSelectedIds([]);
    supabase
      .from("suppliers")
      .select("id, name, category, star_rating, quality_rating, logo_url")
      .eq("status", "active")
      .eq("base_region", baseRegion)
      .order("name")
      .then(({ data }) => {
        setSuppliers(data ?? []);
        setLoadingSuppliers(false);
      });
  }, [baseRegion]);

  useEffect(() => {
    setPriceEstimate(null);
  }, [selectedIds, nights, singleRoom]);

  function toggle(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handlePreviewPrice() {
    setPriceLoading(true);
    try {
      const { eur } = await computePackageTotalEur(
        supabase,
        selectedIds,
        Number(nights) || 1,
        singleRoom
      );
      const formatted = await formatPackagePrice(supabase, eur, agencyCountry, true);
      setPriceEstimate(formatted);
    } finally {
      setPriceLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await submitCustomPackageRequest({
        baseRegion,
        nights: Number(nights),
        groupSize: groupSize ? Number(groupSize) : null,
        supplierIds: selectedIds,
        singleRoom,
        travelMonth: `${travelMonth}-01`,
      });
      setSubmitted(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <p className="rounded-card border border-line bg-white p-5 text-ink/80">
        Thanks — we've received your request and will follow up with a quote.
      </p>
    );
  }

  const grouped = groupByCategory(suppliers);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="region" className="block text-sm font-medium text-ink">
            Region
          </label>
          <select
            id="region"
            required
            value={baseRegion}
            onChange={(e) => setBaseRegion(e.target.value)}
            className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
          >
            <option value="">Select a region</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {REGION_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink">Nights</label>
          <p className="mt-1 flex h-[42px] w-full items-center rounded-card border border-line bg-paper px-4 text-ink/70">
            7 nights — matches the weekly Monday–Monday flight from Oslo.
          </p>
        </div>
      </div>

      {baseRegion && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            Choose what to include ({selectedIds.length} selected)
          </h2>
          <p className="mt-1 text-sm text-ink/60">
            Open a profile to read about a supplier and see their photos
            before adding them.
          </p>

          {loadingSuppliers ? (
            <p className="mt-3 text-sm text-ink/60">Loading suppliers…</p>
          ) : grouped.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">
              No active suppliers in this region yet.
            </p>
          ) : (
            <div className="mt-3 space-y-5">
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
                              href={`/dashboard/suppliers/${s.id}`}
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
      )}

      <div className="space-y-4 border-t border-line pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Your booking request
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="travelMonth" className="block text-sm font-medium text-ink">
              Travel month
            </label>
            <input
              id="travelMonth"
              type="month"
              required
              value={travelMonth}
              onChange={(e) => setTravelMonth(e.target.value)}
              className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
            />
          </div>
          <div>
            <label htmlFor="groupSize" className="block text-sm font-medium text-ink">
              Group size (optional)
            </label>
            <input
              id="groupSize"
              type="number"
              min="1"
              value={groupSize}
              onChange={(e) => setGroupSize(e.target.value)}
              className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink/80">
          <input
            type="checkbox"
            checked={singleRoom}
            onChange={(e) => setSingleRoom(e.target.checked)}
          />
          Single room needed (traveling alone, not sharing a hotel room)
        </label>

        {selectedIds.length > 0 && (
          <div>
            <button
              type="button"
              onClick={handlePreviewPrice}
              disabled={priceLoading}
              className="rounded-card border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-wine disabled:opacity-60"
            >
              {priceLoading ? "Calculating…" : "Estimate price"}
            </button>
            {priceEstimate && (
              <p className="mt-2 font-display text-xl font-semibold text-ink">
                Estimated total: {priceEstimate}
              </p>
            )}
          </div>
        )}

        {message && <p className="text-sm text-wine">{message}</p>}

        {readOnly ? (
          <p className="text-xs text-ink/50">
            Actions are disabled while previewing as a customer.
          </p>
        ) : (
          <button
            type="submit"
            disabled={submitting || !baseRegion || !travelMonth}
            className="rounded-card bg-wine px-4 py-2.5 font-semibold text-paper transition hover:bg-wine-dark disabled:opacity-60"
          >
            {submitting ? "Please wait…" : "Submit for a quote"}
          </button>
        )}
      </div>
    </form>
  );
}
