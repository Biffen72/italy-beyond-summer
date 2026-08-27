"use client";

import { useState } from "react";
import { Lightbox } from "./Lightbox";

type GalleryImage = { id: string; url: string };

// Drop-in replacement for a plain `images.map(img => <img .../>)` — same
// thumbnails, but each one opens a fullscreen Lightbox with prev/next
// through the rest of the set. Renders the <img> tags directly (no
// wrapping element), so it fits straight into an existing grid/flex div.
export function Gallery({
  images,
  thumbClassName,
}: {
  images: GalleryImage[];
  thumbClassName: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      {images.map((img, i) => (
        <img
          key={img.id}
          src={img.url}
          alt=""
          onClick={() => setOpenIndex(i)}
          className={`${thumbClassName} cursor-pointer`}
        />
      ))}
      {openIndex !== null && (
        <Lightbox
          images={images}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onIndexChange={setOpenIndex}
        />
      )}
    </>
  );
}
