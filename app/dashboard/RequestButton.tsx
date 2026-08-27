"use client";

import { useState } from "react";
import { requestReservation } from "./actions";

export function RequestButton({
  packageId,
  readOnly = false,
}: {
  packageId: string;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [travelMonth, setTravelMonth] = useState("");
  const [groupSize, setGroupSize] = useState("");
  const [singleRoom, setSingleRoom] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await requestReservation(packageId, `${travelMonth}-01`, Number(groupSize), singleRoom);
      setSent(true);
      setOpen(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return <p className="mt-4 text-sm text-wine">Reservation request sent.</p>;
  }

  if (readOnly) {
    return (
      <p className="mt-4 text-xs text-ink/50">
        Actions are disabled while previewing as a customer.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 w-full rounded-card bg-wine px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-wine-dark"
      >
        Request reservation
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-2 border-t border-line pt-4">
      <div>
        <label className="block text-xs font-medium text-ink/70">Travel month</label>
        <input
          type="month"
          required
          value={travelMonth}
          onChange={(e) => setTravelMonth(e.target.value)}
          className="mt-1 w-full rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink/70">Group size</label>
        <input
          type="number"
          required
          min="1"
          value={groupSize}
          onChange={(e) => setGroupSize(e.target.value)}
          className="mt-1 w-full rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
        />
      </div>
      <label className="flex items-center gap-2 text-xs font-medium text-ink/70">
        <input
          type="checkbox"
          checked={singleRoom}
          onChange={(e) => setSingleRoom(e.target.checked)}
        />
        Single room (traveling alone, not sharing)
      </label>

      {message && <p className="text-sm text-wine">{message}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-card bg-wine px-3 py-2 text-sm font-semibold text-paper transition hover:bg-wine-dark disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send request"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-card border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-wine"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
