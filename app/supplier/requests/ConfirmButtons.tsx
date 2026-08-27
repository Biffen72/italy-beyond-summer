"use client";

import { useState } from "react";
import { respondToConfirmation } from "./actions";

export function ConfirmButtons({ confirmationId }: { confirmationId: string }) {
  const [loading, setLoading] = useState<"yes" | "no" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState<"yes" | "no" | null>(null);

  async function respond(response: "yes" | "no") {
    setLoading(response);
    setMessage(null);
    try {
      await respondToConfirmation(confirmationId, response);
      setDone(response);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  if (done) {
    return (
      <p className="text-sm font-semibold text-wine">
        {done === "yes" ? "You said yes — recorded." : "You said no — recorded."}
      </p>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => respond("yes")}
          disabled={loading !== null}
          className="rounded-card bg-wine px-4 py-2 text-sm font-semibold text-paper transition hover:bg-wine-dark disabled:opacity-60"
        >
          {loading === "yes" ? "Saving…" : "Yes"}
        </button>
        <button
          type="button"
          onClick={() => respond("no")}
          disabled={loading !== null}
          className="rounded-card border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-wine disabled:opacity-60"
        >
          {loading === "no" ? "Saving…" : "No"}
        </button>
      </div>
      {message && <p className="mt-2 text-sm text-wine">{message}</p>}
    </div>
  );
}
