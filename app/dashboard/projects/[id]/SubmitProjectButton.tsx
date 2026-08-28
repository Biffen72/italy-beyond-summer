"use client";

import { useState } from "react";
import { submitProject } from "./actions";

export function SubmitProjectButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);

  async function handleClick() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await submitProject(projectId);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm text-ink/60">
        This makes the room list and program visible to the relevant suppliers.
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-card bg-wine px-4 py-2.5 font-semibold text-paper transition hover:bg-wine-dark disabled:opacity-60"
      >
        {loading ? "Please wait…" : armed ? "Click again to confirm" : "Opprett program"}
      </button>
      {message && <p className="mt-2 text-sm text-wine">{message}</p>}
    </div>
  );
}
