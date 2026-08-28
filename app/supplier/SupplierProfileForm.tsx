"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  saveDraft,
  submitProfile,
  updateSupplierDetails,
  addSupplierImage,
  removeSupplierImage,
  addRoomType,
  updateRoomType,
  removeRoomType,
  reorderRoomTypes,
  addRoomImage,
  removeRoomImage,
} from "./actions";
import { Lightbox } from "@/components/Lightbox";

type SourceLanguage = "it" | "no" | "sv" | "da" | "en";

const LANGUAGE_LABEL: Record<SourceLanguage, string> = {
  it: "Italian",
  no: "Norwegian",
  sv: "Swedish",
  da: "Danish",
  en: "English",
};

const OTHER_CATEGORY = "__other__";

type SupplierDetails = {
  category: string;
  pricePerPerson: number | null;
  address: string;
  logoUrl: string | null;
  starRating: number | null;
  qualityRating: number | null;
};

type SupplierImage = { id: string; url: string };

type RoomImage = { id: string; url: string };

type RoomType = {
  id: string;
  name: string;
  capacity: number;
  price_per_night: number | null;
  single_supplement: number | null;
  description: string | null;
  sort_order: number;
  images: RoomImage[];
};

type SourceText = {
  language: SourceLanguage;
  headline: string | null;
  description: string | null;
  price_includes: string | null;
} | null;

async function uploadSupplierMedia(
  supabase: ReturnType<typeof createClient>,
  supplierId: string,
  folder: string,
  file: File
) {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${supplierId}/${folder}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from("supplier-media")
    .upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);

  return supabase.storage.from("supplier-media").getPublicUrl(path).data.publicUrl;
}

export function SupplierProfileForm({
  supplierId,
  initialDetails,
  initialImages,
  initialText,
  initialRoomTypes,
  categoryOptions,
  isAdmin = false,
}: {
  supplierId: string;
  initialDetails: SupplierDetails;
  initialImages: SupplierImage[];
  initialText: SourceText;
  initialRoomTypes: RoomType[];
  categoryOptions: string[];
  // The price/quality rating is admin's own judgment call on a
  // supplier's value for money — only admin can see or set it, not the
  // supplier themselves, even though this same form is reused on their
  // self-service /supplier page.
  isAdmin?: boolean;
}) {
  const supabase = createClient();
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Supplier details
  const initialIsOther =
    !!initialDetails.category && !categoryOptions.includes(initialDetails.category);
  const [category, setCategory] = useState(
    initialIsOther ? OTHER_CATEGORY : initialDetails.category || categoryOptions[0] || ""
  );
  const [customCategory, setCustomCategory] = useState(
    initialIsOther ? initialDetails.category : ""
  );
  const [pricePerPerson, setPricePerPerson] = useState(
    initialDetails.pricePerPerson?.toString() ?? ""
  );
  const [address, setAddress] = useState(initialDetails.address);
  const [logoUrl, setLogoUrl] = useState(initialDetails.logoUrl);
  const [starRating, setStarRating] = useState(initialDetails.starRating?.toString() ?? "");
  const [qualityRating, setQualityRating] = useState(
    initialDetails.qualityRating?.toString() ?? ""
  );
  const [images, setImages] = useState(initialImages);
  const [detailsMessage, setDetailsMessage] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);

  // Room types (hotels only)
  const [roomTypes, setRoomTypes] = useState(initialRoomTypes);
  const [roomName, setRoomName] = useState("");
  const [roomCapacity, setRoomCapacity] = useState("2");
  const [roomPrice, setRoomPrice] = useState("");
  const [roomSupplement, setRoomSupplement] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [roomMessage, setRoomMessage] = useState<string | null>(null);
  const [roomLoading, setRoomLoading] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoomName, setEditRoomName] = useState("");
  const [editRoomCapacity, setEditRoomCapacity] = useState("2");
  const [editRoomPrice, setEditRoomPrice] = useState("");
  const [editRoomSupplement, setEditRoomSupplement] = useState("");
  const [editRoomDescription, setEditRoomDescription] = useState("");
  const [editRoomLoading, setEditRoomLoading] = useState(false);
  const [roomImageUploadingFor, setRoomImageUploadingFor] = useState<string | null>(null);
  const [reorderingRoomId, setReorderingRoomId] = useState<string | null>(null);
  const [galleryLightboxIndex, setGalleryLightboxIndex] = useState<number | null>(null);
  const [roomLightbox, setRoomLightbox] = useState<{ roomId: string; index: number } | null>(null);

  // Profile text
  const [language, setLanguage] = useState<SourceLanguage>(initialText?.language ?? "it");
  const [headline, setHeadline] = useState(initialText?.headline ?? "");
  const [description, setDescription] = useState(initialText?.description ?? "");
  const [priceIncludes, setPriceIncludes] = useState(initialText?.price_includes ?? "");
  const [textMessage, setTextMessage] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);

  function resolvedCategory() {
    return category === OTHER_CATEGORY ? customCategory : category;
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setDetailsMessage(null);
    try {
      const url = await uploadSupplierMedia(supabase, supplierId, "logo", file);
      await updateSupplierDetails({
        supplierId,
        category: resolvedCategory(),
        pricePerPerson: pricePerPerson ? Number(pricePerPerson) : null,
        address,
        logoUrl: url,
        starRating: starRating ? Number(starRating) : null,
        qualityRating: qualityRating ? Number(qualityRating) : null,
      });
      setLogoUrl(url);
      setDetailsMessage("Logo uploaded.");
    } catch (err) {
      setDetailsMessage(err instanceof Error ? err.message : "Couldn't upload the logo.");
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  }

  async function handleGalleryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setGalleryUploading(true);
    setDetailsMessage(null);
    try {
      for (const file of files) {
        const url = await uploadSupplierMedia(supabase, supplierId, "gallery", file);
        await addSupplierImage(supplierId, url);
        setImages((prev) => [...prev, { id: url, url }]);
      }
      setDetailsMessage("Images uploaded.");
    } catch (err) {
      setDetailsMessage(err instanceof Error ? err.message : "Couldn't upload the images.");
    } finally {
      setGalleryUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  }

  async function handleRemoveImage(imageId: string) {
    try {
      await removeSupplierImage(supplierId, imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      setDetailsMessage(err instanceof Error ? err.message : "Couldn't remove the image.");
    }
  }

  async function handleSaveDetails() {
    setDetailsLoading(true);
    setDetailsMessage(null);
    try {
      await updateSupplierDetails({
        supplierId,
        category: resolvedCategory(),
        pricePerPerson: pricePerPerson ? Number(pricePerPerson) : null,
        address,
        logoUrl,
        starRating: starRating ? Number(starRating) : null,
        qualityRating: qualityRating ? Number(qualityRating) : null,
      });
      setDetailsMessage("Supplier details saved.");
    } catch (err) {
      setDetailsMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleAddRoomType(e: React.FormEvent) {
    e.preventDefault();
    setRoomLoading(true);
    setRoomMessage(null);
    try {
      const nextSortOrder =
        roomTypes.length > 0 ? Math.max(...roomTypes.map((r) => r.sort_order)) + 1 : 0;
      const result = await addRoomType({
        supplierId,
        name: roomName,
        capacity: Number(roomCapacity),
        pricePerNight: roomPrice ? Number(roomPrice) : null,
        singleSupplement: roomSupplement ? Number(roomSupplement) : null,
        description: roomDescription,
        sortOrder: nextSortOrder,
      });
      setRoomTypes((prev) => [
        ...prev,
        {
          id: result.id,
          name: roomName,
          capacity: Number(roomCapacity),
          price_per_night: roomPrice ? Number(roomPrice) : null,
          single_supplement: roomSupplement ? Number(roomSupplement) : null,
          description: roomDescription,
          sort_order: nextSortOrder,
          images: [],
        },
      ]);
      setRoomName("");
      setRoomCapacity("2");
      setRoomPrice("");
      setRoomSupplement("");
      setRoomDescription("");
    } catch (err) {
      setRoomMessage(err instanceof Error ? err.message : "Couldn't add the room type.");
    } finally {
      setRoomLoading(false);
    }
  }

  async function handleRemoveRoomType(roomTypeId: string) {
    try {
      await removeRoomType(supplierId, roomTypeId);
      setRoomTypes((prev) => prev.filter((r) => r.id !== roomTypeId));
    } catch (err) {
      setRoomMessage(err instanceof Error ? err.message : "Couldn't remove the room type.");
    }
  }

  function startEditingRoom(r: RoomType) {
    setEditingRoomId(r.id);
    setEditRoomName(r.name);
    setEditRoomCapacity(r.capacity.toString());
    setEditRoomPrice(r.price_per_night?.toString() ?? "");
    setEditRoomSupplement(r.single_supplement?.toString() ?? "");
    setEditRoomDescription(r.description ?? "");
  }

  async function handleSaveRoomEdit(roomTypeId: string) {
    setEditRoomLoading(true);
    setRoomMessage(null);
    try {
      await updateRoomType(roomTypeId, {
        supplierId,
        name: editRoomName,
        capacity: Number(editRoomCapacity),
        pricePerNight: editRoomPrice ? Number(editRoomPrice) : null,
        singleSupplement: editRoomSupplement ? Number(editRoomSupplement) : null,
        description: editRoomDescription,
      });
      setRoomTypes((prev) =>
        prev.map((r) =>
          r.id === roomTypeId
            ? {
                ...r,
                name: editRoomName,
                capacity: Number(editRoomCapacity),
                price_per_night: editRoomPrice ? Number(editRoomPrice) : null,
                single_supplement: editRoomSupplement ? Number(editRoomSupplement) : null,
                description: editRoomDescription,
              }
            : r
        )
      );
      setEditingRoomId(null);
    } catch (err) {
      setRoomMessage(err instanceof Error ? err.message : "Couldn't save the room type.");
    } finally {
      setEditRoomLoading(false);
    }
  }

  function sortedRoomTypes() {
    return [...roomTypes].sort((a, b) => a.sort_order - b.sort_order);
  }

  async function handleMoveRoom(roomTypeId: string, direction: "up" | "down") {
    const sorted = sortedRoomTypes();
    const index = sorted.findIndex((r) => r.id === roomTypeId);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || swapIndex < 0 || swapIndex >= sorted.length) return;

    const reordered = [...sorted];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    const orderedIds = reordered.map((r) => r.id);

    setReorderingRoomId(roomTypeId);
    setRoomMessage(null);
    try {
      await reorderRoomTypes(supplierId, orderedIds);
      setRoomTypes((prev) =>
        prev.map((r) => {
          const newIndex = orderedIds.indexOf(r.id);
          return newIndex === -1 ? r : { ...r, sort_order: newIndex };
        })
      );
    } catch (err) {
      setRoomMessage(err instanceof Error ? err.message : "Couldn't reorder the rooms.");
    } finally {
      setReorderingRoomId(null);
    }
  }

  async function handleRoomImageUpload(
    roomTypeId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setRoomImageUploadingFor(roomTypeId);
    setRoomMessage(null);
    try {
      for (const file of files) {
        const url = await uploadSupplierMedia(supabase, supplierId, `rooms/${roomTypeId}`, file);
        const result = await addRoomImage(supplierId, roomTypeId, url);
        setRoomTypes((prev) =>
          prev.map((r) =>
            r.id === roomTypeId ? { ...r, images: [...r.images, { id: result.id, url }] } : r
          )
        );
      }
    } catch (err) {
      setRoomMessage(err instanceof Error ? err.message : "Couldn't upload the room photo.");
    } finally {
      setRoomImageUploadingFor(null);
      e.target.value = "";
    }
  }

  async function handleRemoveRoomImage(roomTypeId: string, imageId: string) {
    try {
      await removeRoomImage(supplierId, roomTypeId, imageId);
      setRoomTypes((prev) =>
        prev.map((r) =>
          r.id === roomTypeId ? { ...r, images: r.images.filter((img) => img.id !== imageId) } : r
        )
      );
    } catch (err) {
      setRoomMessage(err instanceof Error ? err.message : "Couldn't remove the room photo.");
    }
  }

  function currentTextInput() {
    return { supplierId, language, headline, description, priceIncludes };
  }

  async function handleSaveDraft() {
    setTextLoading(true);
    setTextMessage(null);
    try {
      await saveDraft(currentTextInput());
      setTextMessage("Saved as draft.");
    } catch (err) {
      setTextMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setTextLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTextLoading(true);
    setTextMessage(null);
    try {
      const result = await submitProfile(currentTextInput());
      setTextMessage(
        result.translationWarning
          ? "Your profile is published. The translation failed — contact us if it doesn't show up soon."
          : "Your profile is published, and translation into the other languages is underway."
      );
    } catch (err) {
      setTextMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setTextLoading(false);
    }
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Supplier details
        </h2>

        <div className="flex flex-wrap gap-6">
          <div>
            <label className="block text-sm font-medium text-ink">
              Upload a logo or photo
            </label>
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo"
                className="mt-2 h-16 w-16 rounded-card border border-line object-cover"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              disabled={logoUploading}
              className="mt-2 text-sm text-ink/70"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">
              Upload photos of your place
            </label>
            {images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div key={img.id} className="relative">
                    <img
                      src={img.url}
                      alt=""
                      onClick={() => setGalleryLightboxIndex(i)}
                      className="h-16 w-16 cursor-pointer rounded-card border border-line object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.id)}
                      className="absolute -right-2 -top-2 rounded-full bg-wine px-1.5 text-xs text-paper"
                      aria-label="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {galleryLightboxIndex !== null && (
              <Lightbox
                images={images}
                index={galleryLightboxIndex}
                onClose={() => setGalleryLightboxIndex(null)}
                onIndexChange={setGalleryLightboxIndex}
              />
            )}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleGalleryChange}
              disabled={galleryUploading}
              className="mt-2 text-sm text-ink/70"
            />
          </div>
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-ink">
            Supplier category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value={OTHER_CATEGORY}>Other (Write what it is)</option>
          </select>
          {category === OTHER_CATEGORY && (
            <input
              type="text"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="Write what it is"
              className="mt-2 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
            />
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex-1">
            <label htmlFor="price" className="block text-sm font-medium text-ink">
              Price per person (EUR)
              {resolvedCategory() === "Hotel" && " — per night, standard room"}
            </label>
            <input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={pricePerPerson}
              onChange={(e) => setPricePerPerson(e.target.value)}
              className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
            />
          </div>
          <div className="flex-[2]">
            <label htmlFor="address" className="block text-sm font-medium text-ink">
              Address
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
            />
          </div>
          {resolvedCategory() === "Hotel" && (
            <div>
              <label htmlFor="starRating" className="block text-sm font-medium text-ink">
                Star rating
              </label>
              <select
                id="starRating"
                value={starRating}
                onChange={(e) => setStarRating(e.target.value)}
                className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
              >
                <option value="">Not rated</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {"★".repeat(n)} ({n})
                  </option>
                ))}
              </select>
            </div>
          )}
          {isAdmin && resolvedCategory() !== "Hotel" && (
            <div>
              <label htmlFor="qualityRating" className="block text-sm font-medium text-ink">
                Price/quality rating (admin only)
              </label>
              <select
                id="qualityRating"
                value={qualityRating}
                onChange={(e) => setQualityRating(e.target.value)}
                className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
              >
                <option value="">Not rated</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {"👍".repeat(n)} ({n})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {detailsMessage && <p className="text-sm text-wine">{detailsMessage}</p>}

        <button
          type="button"
          onClick={handleSaveDetails}
          disabled={detailsLoading}
          className="rounded-card border border-line bg-white px-4 py-2.5 font-semibold text-ink transition hover:border-wine disabled:opacity-60"
        >
          Save supplier details
        </button>
      </section>

      {resolvedCategory() === "Hotel" && (
        <section className="space-y-4 border-t border-line pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            Room types
          </h2>
          <p className="text-sm text-ink/60">
            Each room type's price is a supplement added on top of your
            price per person above (0 for a standard room, more for a
            suite — it can even be negative for a discounted room). The
            single-room supplement applies only when a guest books that
            room alone, instead of sharing.
          </p>

          {roomTypes.length > 0 && (
            <ul className="space-y-2">
              {sortedRoomTypes().map((r, index) =>
                editingRoomId === r.id ? (
                  <li
                    key={r.id}
                    className="grid grid-cols-1 gap-3 rounded-card border border-line bg-white p-4 md:grid-cols-2"
                  >
                    <div>
                      <label className="block text-xs font-medium text-ink/70">
                        Room type name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Double Room"
                        value={editRoomName}
                        onChange={(e) => setEditRoomName(e.target.value)}
                        className="mt-1 w-full rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink/70">
                        Capacity — how many guests this room sleeps
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={editRoomCapacity}
                        onChange={(e) => setEditRoomCapacity(e.target.value)}
                        className="mt-1 w-full rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink/70">
                        Price supplement per night (EUR) — added to your
                        price per person, can be negative
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editRoomPrice}
                        onChange={(e) => setEditRoomPrice(e.target.value)}
                        className="mt-1 w-full rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink/70">
                        Single-room supplement (EUR) — extra charge for
                        booking this room alone, not shared
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editRoomSupplement}
                        onChange={(e) => setEditRoomSupplement(e.target.value)}
                        className="mt-1 w-full rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-ink/70">
                        Description (optional)
                      </label>
                      <textarea
                        value={editRoomDescription}
                        onChange={(e) => setEditRoomDescription(e.target.value)}
                        className="mt-1 w-full rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
                      />
                    </div>
                    <div className="flex gap-3 md:col-span-2">
                      <button
                        type="button"
                        onClick={() => handleSaveRoomEdit(r.id)}
                        disabled={editRoomLoading}
                        className="rounded-card bg-wine px-4 py-2 text-sm font-semibold text-paper transition hover:bg-wine-dark disabled:opacity-60"
                      >
                        {editRoomLoading ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingRoomId(null)}
                        className="rounded-card border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-wine"
                      >
                        Cancel
                      </button>
                    </div>
                  </li>
                ) : (
                  <li
                    key={r.id}
                    className="rounded-card border border-line bg-white px-4 py-2.5 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-ink">
                        {r.name} · sleeps {r.capacity}
                        {r.price_per_night != null ? ` · ${r.price_per_night >= 0 ? "+" : ""}€${r.price_per_night}/night` : ""}
                        {r.single_supplement != null
                          ? ` · +€${r.single_supplement} single supplement`
                          : ""}
                      </span>
                      <span className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleMoveRoom(r.id, "up")}
                          disabled={index === 0 || reorderingRoomId !== null}
                          aria-label="Move up"
                          className="text-xs font-semibold text-ink/70 disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveRoom(r.id, "down")}
                          disabled={index === sortedRoomTypes().length - 1 || reorderingRoomId !== null}
                          aria-label="Move down"
                          className="text-xs font-semibold text-ink/70 disabled:opacity-30"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditingRoom(r)}
                          className="text-xs font-semibold text-ink/70"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveRoomType(r.id)}
                          className="text-xs font-semibold text-wine"
                        >
                          Remove
                        </button>
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {r.images.map((img, i) => (
                        <div key={img.id} className="relative">
                          <img
                            src={img.url}
                            alt=""
                            onClick={() => setRoomLightbox({ roomId: r.id, index: i })}
                            className="h-14 w-14 cursor-pointer rounded-card border border-line object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveRoomImage(r.id, img.id)}
                            className="absolute -right-2 -top-2 rounded-full bg-wine px-1.5 text-xs text-paper"
                            aria-label="Remove photo"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <label className="text-xs font-medium text-ink/60">
                        {roomImageUploadingFor === r.id ? "Uploading…" : "Add photo"}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={roomImageUploadingFor === r.id}
                          onChange={(e) => handleRoomImageUpload(r.id, e)}
                          className="mt-1 block text-xs text-ink/70"
                        />
                      </label>
                    </div>
                  </li>
                )
              )}
            </ul>
          )}

          {roomLightbox &&
            (() => {
              const room = roomTypes.find((r) => r.id === roomLightbox.roomId);
              if (!room) return null;
              return (
                <Lightbox
                  images={room.images}
                  index={roomLightbox.index}
                  onClose={() => setRoomLightbox(null)}
                  onIndexChange={(index) => setRoomLightbox({ roomId: room.id, index })}
                />
              );
            })()}

          <form
            onSubmit={handleAddRoomType}
            className="grid grid-cols-1 gap-3 rounded-card border border-line bg-white p-4 md:grid-cols-2"
          >
            <div>
              <label className="block text-xs font-medium text-ink/70">
                Room type name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Double Room"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="mt-1 w-full rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/70">
                Capacity — how many guests this room sleeps
              </label>
              <input
                type="number"
                required
                min="1"
                value={roomCapacity}
                onChange={(e) => setRoomCapacity(e.target.value)}
                className="mt-1 w-full rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/70">
                Price supplement per night (EUR) — added to your price
                per person, can be negative
              </label>
              <input
                type="number"
                step="0.01"
                value={roomPrice}
                onChange={(e) => setRoomPrice(e.target.value)}
                className="mt-1 w-full rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/70">
                Single-room supplement (EUR) — extra charge for booking
                this room alone, not shared
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={roomSupplement}
                onChange={(e) => setRoomSupplement(e.target.value)}
                className="mt-1 w-full rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-ink/70">
                Description (optional)
              </label>
              <textarea
                value={roomDescription}
                onChange={(e) => setRoomDescription(e.target.value)}
                className="mt-1 w-full rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
              />
            </div>

            {roomMessage && <p className="text-sm text-wine md:col-span-2">{roomMessage}</p>}

            <button
              type="submit"
              disabled={roomLoading}
              className="rounded-card bg-wine px-4 py-2 text-sm font-semibold text-paper transition hover:bg-wine-dark disabled:opacity-60 md:col-span-2"
            >
              {roomLoading ? "Please wait…" : "Add room type"}
            </button>
          </form>
        </section>
      )}

      <section className="space-y-4 border-t border-line pt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Profile text
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-ink">
              Language you're writing in
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as SourceLanguage)}
              className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
            >
              {(Object.keys(LANGUAGE_LABEL) as SourceLanguage[]).map((l) => (
                <option key={l} value={l}>
                  {LANGUAGE_LABEL[l]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="headline" className="block text-sm font-medium text-ink">
              Headline
            </label>
            <input
              id="headline"
              type="text"
              required
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-ink">
              Describe the activity and what guests will experience
            </label>
            <textarea
              id="description"
              required
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
            />
          </div>

          <div>
            <label htmlFor="priceIncludes" className="block text-sm font-medium text-ink">
              What's included in the price
            </label>
            <textarea
              id="priceIncludes"
              rows={2}
              value={priceIncludes}
              onChange={(e) => setPriceIncludes(e.target.value)}
              placeholder="E.g. 1 bottle of wine, guided tour, talk and light refreshments"
              className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
            />
          </div>

          {textMessage && <p className="text-sm text-wine">{textMessage}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={textLoading}
              className="rounded-card border border-line bg-white px-4 py-2.5 font-semibold text-ink transition hover:border-wine disabled:opacity-60"
            >
              Save as draft
            </button>
            <button
              type="submit"
              disabled={textLoading}
              className="rounded-card bg-wine px-4 py-2.5 font-semibold text-paper transition hover:bg-wine-dark disabled:opacity-60"
            >
              {textLoading ? "Please wait…" : "Publish and translate"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
