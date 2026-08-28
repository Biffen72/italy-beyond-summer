"use client";

import { useState } from "react";
import { addCategory, deleteCategory, updateCategoryImage } from "./actions";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/lib/categories";

async function uploadCategoryImage(
  supabase: ReturnType<typeof createClient>,
  file: File
) {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `categories/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from("supplier-media")
    .upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);

  return supabase.storage.from("supplier-media").getPublicUrl(path).data.publicUrl;
}

function CategoryImage({ id, imageUrl }: { id: string; imageUrl: string | null }) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const url = await uploadCategoryImage(supabase, file);
      await updateCategoryImage(id, url);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't upload the image.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <span className="flex items-center gap-2">
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="h-8 w-8 rounded-card border border-line object-cover"
        />
      )}
      <label className="text-xs font-semibold text-ink/60 hover:text-wine">
        {uploading ? "Uploading…" : imageUrl ? "Change photo" : "Add photo"}
        <input
          type="file"
          accept="image/*"
          onChange={handleChange}
          disabled={uploading}
          className="hidden"
        />
      </label>
      {message && <span className="text-xs text-wine">{message}</span>}
    </span>
  );
}

export function CategoryForm({
  kind,
  categories,
}: {
  kind: "package" | "supplier";
  categories: (Category & { id: string })[];
}) {
  const supabase = createClient();
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [showOnHomepage, setShowOnHomepage] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    setMessage(null);
    try {
      const url = await uploadCategoryImage(supabase, file);
      setImageUrl(url);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't upload the image.");
    } finally {
      setImageUploading(false);
      e.target.value = "";
    }
  }

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
        imageUrl,
        showOnHomepage,
      });
      setValue("");
      setLabel("");
      setIcon("");
      setImageUrl(null);
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
            className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-line px-4 py-2.5 text-sm"
          >
            <span className="flex items-center text-ink">
              {c.icon && <span className="mr-2">{c.icon}</span>}
              {c.label}
              <span className="ml-2 text-xs text-ink/50">({c.value})</span>
              {kind === "package" && !c.show_on_homepage && (
                <span className="ml-2 text-xs text-ink/40">— not on homepage</span>
              )}
            </span>
            <span className="flex items-center gap-3">
              {kind === "package" && <CategoryImage id={c.id} imageUrl={c.image_url} />}
              <button
                type="button"
                onClick={() => handleDelete(c.id, c.value)}
                disabled={deletingId === c.id}
                className="text-xs font-semibold text-wine disabled:opacity-60"
              >
                {deletingId === c.id ? "Deleting…" : "Delete"}
              </button>
            </span>
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-ink">
                Photo (optional — shows instead of the icon on the homepage box)
              </label>
              <div className="mt-1 flex items-center gap-3">
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt=""
                    className="h-12 w-12 rounded-card border border-line object-cover"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={imageUploading}
                  className="text-sm text-ink/70"
                />
              </div>
              {imageUploading && <p className="mt-1 text-xs text-ink/60">Uploading…</p>}
            </div>
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
