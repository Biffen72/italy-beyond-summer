"use client";

import { useState } from "react";
import { bookRequest, cancelRequest } from "./actions";
import type { RequestType } from "@/lib/confirmations";

export function BookOrCancelButtons({
  requestType,
  requestId,
}: {
  requestType: RequestType;
  requestId: string;
}) {
  const [loading, setLoading] = useState<"book" | "cancel" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState<"book" | "cancel" | null>(null);

  async function handle(action: "book" | "cancel") {
    setLoading(action);
    setMessage(null);
    try {
      if (action === "book") {
        await bookRequest(requestType, requestId);
      } else {
        await cancelRequest(requestType, requestId);
      }
      setDone(action);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  if (done) {
    return (
      <p className="text-sm font-semibold text-wine">
        {done === "book" ? "Booked!" : "Request cancelled."}
      </p>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handle("book")}
          disabled={loading !== null}
          className="rounded-card bg-wine px-4 py-2 text-sm font-semibold text-paper transition hover:bg-wine-dark disabled:opacity-60"
        >
          {loading === "book" ? "Booking…" : "Book now"}
        </button>
        <button
          type="button"
          onClick={() => handle("cancel")}
          disabled={loading !== null}
          className="rounded-card border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-wine disabled:opacity-60"
        >
          {loading === "cancel" ? "Cancelling…" : "Cancel request"}
        </button>
      </div>
      {message && <p className="mt-2 text-sm text-wine">{message}</p>}
    </div>
  );
}
