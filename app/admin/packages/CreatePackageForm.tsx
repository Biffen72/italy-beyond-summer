"use client";

import { useState } from "react";
import { createPackage, type ItineraryDayInput } from "./actions";
import { SupplierPicker } from "./SupplierPicker";
import { ItineraryEditor } from "./ItineraryEditor";
import { createClient } from "@/lib/supabase/client";
import { computePackageTotalEur } from "@/lib/pricing";
import { REGIONS, REGION_LABEL } from "@/lib/regions";

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

export function CreatePackageForm({
  suppliers,
  packageTypes,
}: {
  suppliers: SupplierOption[];
  packageTypes: PackageTypeOption[];
}) {
  const [title, setTitle] = useState("");
  const [packageType, setPackageType] = useState(packageTypes[0]?.value ?? "");
  const [nights, setNights] = useState("7");
  const [baseRegion, setBaseRegion] = useState("");
  const [priceEur, setPriceEur] = useState("");
  const [description, setDescription] = useState("");
  const [supplierIds, setSupplierIds] = useState<string[]>([]);
  const [itinerary, setItinerary] = useState<ItineraryDayInput[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestedTotal, setSuggestedTotal] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await createPackage({
        title,
        packageType,
        nights: Number(nights),
        baseRegion,
        priceEur: Number(priceEur),
        description,
        supplierIds,
        itinerary,
      });
      setTitle("");
      setNights("7");
      setBaseRegion("");
      setPriceEur("");
      setDescription("");
      setSupplierIds([]);
      setItinerary([]);
      setMessage("Package created.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-3 rounded-card border border-line bg-white p-5 md:grid-cols-2"
    >
      <input
        type="text"
        required
        placeholder="Title"
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
        required
        min="1"
        placeholder="Number of nights"
        value={nights}
        onChange={(e) => setNights(e.target.value)}
        className="rounded-card border border-line px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
      />
      <select
        required
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
        required
        min="0"
        step="0.01"
        placeholder="Price (EUR)"
        value={priceEur}
        onChange={(e) => setPriceEur(e.target.value)}
        className="rounded-card border border-line px-4 py-2.5 text-ink outline-none focus-visible:border-wine md:col-span-2"
      />
      <textarea
        placeholder="Description"
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

      <button
        type="submit"
        disabled={loading}
        className="rounded-card bg-wine px-4 py-2.5 font-semibold text-paper transition hover:bg-wine-dark disabled:opacity-60 md:col-span-2"
      >
        {loading ? "Please wait…" : "Create package"}
      </button>
    </form>
  );
}
