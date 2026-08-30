"use client";

import { useState } from "react";

export function ShareLinkBox({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context) — the
      // input below still lets them select and copy manually.
    }
  }

  return (
    <div className="rounded-card border border-line bg-white p-4">
      <p className="text-sm font-semibold text-ink">Share with travellers</p>
      <p className="mt-1 text-sm text-ink/60">
        Send this link by email or SMS yourself — it shows the program and
        accommodation, no login needed.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="text"
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 rounded-card border border-line bg-paper px-3 py-2 text-sm text-ink outline-none"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-card border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-wine"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
