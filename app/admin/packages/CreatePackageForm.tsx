"use client";

import { useState } from "react";
import { createPackage } from "./actions";
import { PACKAGE_TYPES, PACKAGE_TYPE_LABEL, type PackageType } from "@/lib/packageTypes";
import { SupplierPicker } from "./SupplierPicker";
import { createClient } from "@/lib/supabase/client";
import { computePackageTotalEur } from "@/lib/pricing";

type SupplierOption = { id: string; name: string; category: string };

export function CreatePackageForm({ suppliers }: { suppliers: SupplierOption[] }) {
  const [title, setTitle] = useState("");
  const [packageType, setPackageType] = useState<PackageType>(PACKAGE_TYPES[0]);
  const [nights, setNights] = useState("");
  const [baseRegion, setBaseRegion] = useState("");
  const [priceEur, setPriceEur] = useState("");
  const [description, setDescription] = useState("");
  const [supplierIds, setSupplierIds] = useState<string[]>([]);
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
      });
      setTitle("");
      setNights("");
      setBaseRegion("");
      setPriceEur("");
      setDescription("");
      setSupplierIds([]);
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
        onChange={(e) => setPackageType(e.target.value as PackageType)}
        className="rounded-card border border-line px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
      >
        {PACKAGE_TYPES.map((t) => (
          <option key={t} value={t}>
            {PACKAGE_TYPE_LABEL[t]}
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
      <input
        type="text"
        required
        placeholder="Region (e.g. lamezia-tropea)"
        value={baseRegion}
        onChange={(e) => setBaseRegion(e.target.value)}
        className="rounded-card border border-line px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
      />
      <input
        type="number"
        required
        min="0"
        step="0.01"
        placeholder="Price (EUR)"
        value={priceEur}
        onChange={(e) => setPriceEur(e.target.value)}
        className="rounded-card border border-line px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
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
      />

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
