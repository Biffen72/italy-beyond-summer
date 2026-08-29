"use client";

import { useState } from "react";
import { proposeAlternativeSupplier } from "./actions";

type CandidateOption = { id: string; name: string };

export function SuggestAlternativeForm({
  confirmationId,
  candidates,
}: {
  confirmationId: string;
  candidates: CandidateOption[];
}) {
  const [selected, setSelected] = useState(candidates[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setMessage(null);
    try {
      await proposeAlternativeSupplier(confirmationId, selected);
      setDone(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return <p className="text-xs font-semibold text-ink/60">Alternative proposed — awaiting their response.</p>;
  }

  if (candidates.length === 0) {
    return <p className="text-xs text-ink/50">No other active suppliers match this category/region.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="rounded-card border border-line px-2 py-1 text-xs text-ink outline-none focus-visible:border-wine"
      >
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={loading}
        className="rounded-card bg-wine px-3 py-1 text-xs font-semibold text-paper transition hover:bg-wine-dark disabled:opacity-60"
      >
        {loading ? "Proposing…" : "Propose"}
      </button>
      {message && <span className="text-xs text-wine">{message}</span>}
    </form>
  );
}
