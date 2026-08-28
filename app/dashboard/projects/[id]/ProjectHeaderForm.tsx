"use client";

import { useState } from "react";
import { updateProjectDetails } from "./actions";

export function ProjectHeaderForm({
  projectId,
  initialName,
  initialStartDate,
  initialEndDate,
  initialGroupSize,
}: {
  projectId: string;
  initialName: string;
  initialStartDate: string | null;
  initialEndDate: string | null;
  initialGroupSize: number | null;
}) {
  const [name, setName] = useState(initialName);
  const [startDate, setStartDate] = useState(initialStartDate ?? "");
  const [endDate, setEndDate] = useState(initialEndDate ?? "");
  const [groupSize, setGroupSize] = useState(initialGroupSize?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      await updateProjectDetails(projectId, {
        name,
        startDate: startDate || null,
        endDate: endDate || null,
        groupSize: groupSize ? Number(groupSize) : null,
      });
      setMessage("Saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 rounded-card border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Project name"
        className="rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine lg:col-span-2"
      />
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
      />
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        className="rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
      />
      <input
        type="number"
        min="1"
        value={groupSize}
        onChange={(e) => setGroupSize(e.target.value)}
        placeholder="Group size"
        className="rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-card border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-wine disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {message && <p className="text-xs text-wine">{message}</p>}
      </div>
    </div>
  );
}
