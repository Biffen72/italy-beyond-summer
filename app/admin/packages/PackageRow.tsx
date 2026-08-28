"use client";

import { useState } from "react";
import { updatePackage, deletePackage, setPackageActive, type ItineraryDayInput } from "./actions";
import { SupplierPicker } from "./SupplierPicker";
import { ItineraryEditor } from "./ItineraryEditor";
import { createClient } from "@/lib/supabase/client";
import { computePackageTotalEur } from "@/lib/pricing";
import { REGIONS, REGION_LABEL } from "@/lib/regions";

type Package = {
  id: string;
  title: string;
  package_type: string;
  nights: number;
  base_region: string;
  price_eur: number;
  description: string | null;
  active: boolean;
};

type SupplierOption = {
  id: string;
  name: string;
  category: string;
  base_region: string;
  logo_url?: string | null;
  star_rating?: number | null;
  quality_rating?: number | null;
};
type PackageTypeOption = { value: string; label: string };

export function PackageRow({
  pkg,
  suppliers,
  packageTypes,
  initialSupplierIds,
  initialItinerary,
}: {
  pkg: Package;
  suppliers: SupplierOption[];
  packageTypes: PackageTypeOption[];
  initialSupplierIds: string[];
  initialItinerary: ItineraryDayInput[];
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(pkg.title);
  const [packageType, setPackageType] = useState(pkg.package_type);
  const [nights, setNights] = useState(pkg.nights.toString());
  const [baseRegion, setBaseRegion] = useState(pkg.base_region);
  const [priceEur, setPriceEur] = useState(pkg.price_eur.toString());
  const [description, setDescription] = useState(pkg.description ?? "");
  const [supplierIds, setSupplierIds] = useState<string[]>(initialSupplierIds);
  const [itinerary, setItinerary] = useState<ItineraryDayInput[]>(initialItinerary);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestedTotal, setSuggestedTotal] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const typeLabel = packageTypes.find((t) => t.value === pkg.package_type)?.label ?? pkg.package_type;

  async function handlePreviewTotal() {
    setPreviewLoading(true);
    try {
      const supabase = createClient();
      const { eur, missingPriceCount } = await computePackageTotalEur(
        supabase,
        supplierIds,
        Number(nights) || 1
      );
      const withMarkup = eur * 1.1;
      setSuggestedTotal(
        `€${withMarkup.toLocaleString("en-US", { maximumFractionDigits: 0 })} (before currency conversion/rounding)` +
          (missingPriceCount > 0 ? ` — ${missingPriceCount} supplier(s) have no price set` : "")
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSave() {
    setLoading(true);
    setMessage(null);
    try {
      await updatePackage(pkg.id, {
        title,
        packageType,
        nights: Number(nights),
        baseRegion,
        priceEur: Number(priceEur),
        description,
        supplierIds,
        itinerary,
      });
      setEditing(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    setMessage(null);
    try {
      await deletePackage(pkg.id);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  async function handleToggleActive() {
    setLoading(true);
    setMessage(null);
    try {
      await setPackageActive(pkg.id, !pkg.active);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  if (editing) {
    return (
      <article className="grid grid-cols-1 gap-3 rounded-card border border-line bg-white p-5 md:grid-cols-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-card border border-line px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
        />
        <select
          value={packageType}
          onChange={(e) => setPackageType(e.target.value)}
          className="rounded-card border border-line px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
        >
          {packageTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          value={nights}
          onChange={(e) => setNights(e.target.value)}
          className="rounded-card border border-line px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
        />
        <select
          value={baseRegion}
          onChange={(e) => setBaseRegion(e.target.value)}
          className="rounded-card border border-line px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
        >
          <option value="">Select a region</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {REGION_LABEL[r]}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          step="0.01"
          value={priceEur}
          onChange={(e) => setPriceEur(e.target.value)}
          className="rounded-card border border-line px-4 py-2.5 text-ink outline-none focus-visible:border-wine md:col-span-2"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-card border border-line px-4 py-2.5 text-ink outline-none focus-visible:border-wine md:col-span-2"
        />

        <SupplierPicker
          suppliers={suppliers}
          selectedIds={supplierIds}
          onChange={setSupplierIds}
          region={baseRegion}
        />

        <ItineraryEditor days={itinerary} onChange={setItinerary} />

        <div className="md:col-span-2">
          <button
            type="button"
            onClick={handlePreviewTotal}
            disabled={previewLoading || supplierIds.length === 0}
            className="rounded-card border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-wine disabled:opacity-60"
          >
            {previewLoading ? "Calculating…" : "Preview suggested total"}
          </button>
          {suggestedTotal && <p className="mt-2 text-xs text-ink/60">{suggestedTotal}</p>}
        </div>

        {message && <p className="text-sm text-wine md:col-span-2">{message}</p>}

        <div className="flex gap-3 md:col-span-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="rounded-card bg-wine px-4 py-2 text-sm font-semibold text-paper transition hover:bg-wine-dark disabled:opacity-60"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-card border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-wine"
          >
            Cancel
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className={`rounded-card border border-line bg-white p-5 ${pkg.active ? "" : "opacity-60"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-wine">
        {typeLabel} · {pkg.nights} nights
        {!pkg.active && " · Retired"}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-ink">{pkg.title}</h2>
      <p className="mt-1 text-sm text-ink/60">{pkg.description}</p>
      <p className="mt-3 font-display text-xl font-semibold text-ink">
        €{Number(pkg.price_eur).toLocaleString("en-US")}
      </p>
      <p className="mt-2 text-xs text-ink/50">
        {initialSupplierIds.length} linked supplier
        {initialSupplierIds.length === 1 ? "" : "s"} · {initialItinerary.length} itinerary day
        {initialItinerary.length === 1 ? "" : "s"}
      </p>

      {message && <p className="mt-2 text-sm text-wine">{message}</p>}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-card border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-wine"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleToggleActive}
          disabled={loading}
          className="rounded-card border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-wine disabled:opacity-60"
        >
          {pkg.active ? "Retire" : "Reactivate"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="rounded-card border border-line bg-white px-4 py-2 text-sm font-semibold text-wine transition hover:border-wine disabled:opacity-60"
        >
          Delete
        </button>
      </div>
    </article>
  );
}
