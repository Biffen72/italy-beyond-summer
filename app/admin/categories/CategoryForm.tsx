"use client";

import { useState } from "react";
import { addCategory, deleteCategory } from "./actions";
import type { Category } from "@/lib/categories";

export function CategoryForm({
  kind,
  categories,
}: {
  kind: "package" | "supplier";
  categories: (Category & { id: string })[];
}) {
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("");
  const [showOnHomepage, setShowOnHomepage] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await addCategory({
        kind,
        value,
        label,
        icon: icon || null,
        showOnHomepage,
      });
      setValue("");
      setLabel("");
      setIcon("");
      setShowOnHomepage(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, categoryValue: string) {
    setDeletingId(id);
    setMessage(null);
    try {
      await deleteCategory(id, kind, categoryValue);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-card border border-line bg-white p-5">
      <h2 className="text-lg font-semibold text-ink">
        {kind === "package" ? "Package themes" : "Supplier categories"}
      </h2>
      <p className="mt-1 text-sm text-ink/60">
        {kind === "package"
          ? "Shown as the type dropdown on packages, and as homepage boxes when enabled."
          : "Shown as the category dropdown on supplier profiles."}
      </p>

      <ul className="mt-4 space-y-2">
        {categories.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-card border border-line px-4 py-2.5 text-sm"
          >
            <span className="text-ink">
              {c.icon && <span className="mr-2">{c.icon}</span>}
              {c.label}
              <span className="ml-2 text-xs text-ink/50">({c.value})</span>
              {kind === "package" && !c.show_on_homepage && (
                <span className="ml-2 text-xs text-ink/40">— not on homepage</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => handleDelete(c.id, c.value)}
              disabled={deletingId === c.id}
              className="text-xs font-semibold text-wine disabled:opacity-60"
            >
              {deletingId === c.id ? "Deleting…" : "Delete"}
            </button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={handleSubmit}
        className="mt-4 grid grid-cols-1 gap-3 border-t border-line pt-4 md:grid-cols-2"
      >
        <input
          type="text"
          required
          placeholder="Value (e.g. surfing)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
        />
        <input
          type="text"
          required
          placeholder="Label (e.g. Surfing)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
        />
        {kind === "package" && (
          <>
            <input
              type="text"
              placeholder="Icon (emoji, optional)"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
            />
            <label className="flex items-center gap-2 text-sm text-ink/80">
              <input
                type="checkbox"
                checked={showOnHomepage}
                onChange={(e) => setShowOnHomepage(e.target.checked)}
              />
              Show as a homepage box
            </label>
          </>
        )}

        {message && <p className="text-sm text-wine md:col-span-2">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-card bg-wine px-4 py-2 text-sm font-semibold text-paper transition hover:bg-wine-dark disabled:opacity-60 md:col-span-2"
        >
          {loading ? "Adding…" : "Add category"}
        </button>
      </form>
    </div>
  );
}
