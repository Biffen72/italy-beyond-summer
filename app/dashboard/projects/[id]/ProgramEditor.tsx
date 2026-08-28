"use client";

import { useState } from "react";
import { syncProgramDays, type ProgramDayInput } from "./actions";

type SupplierOption = { id: string; name: string; category: string };

export function ProgramEditor({
  projectId,
  supplierOptions,
  initialDays,
  readOnly,
}: {
  projectId: string;
  supplierOptions: SupplierOption[];
  initialDays: ProgramDayInput[];
  readOnly: boolean;
}) {
  const [days, setDays] = useState<ProgramDayInput[]>(initialDays);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function addDay() {
    const nextDayNumber = days.length > 0 ? Math.max(...days.map((d) => d.dayNumber)) + 1 : 1;
    setDays([
      ...days,
      { dayNumber: nextDayNumber, title: "", description: "", timeOfDay: "", supplierId: null },
    ]);
  }

  function updateDay(index: number, patch: Partial<ProgramDayInput>) {
    setDays(days.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function removeDay(index: number) {
    setDays(days.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      await syncProgramDays(projectId, days);
      setMessage("Program saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (readOnly) {
    return (
      <ol className="space-y-3">
        {days.map((day, i) => (
          <li key={i} className="rounded-card border border-line bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-wine">
              Day {day.dayNumber}
              {day.timeOfDay ? ` · ${day.timeOfDay}` : ""}
            </p>
            <p className="mt-1 font-semibold text-ink">{day.title}</p>
            {day.description && <p className="mt-1 text-sm text-ink/70">{day.description}</p>}
            {day.supplierId && (
              <p className="mt-1 text-xs text-ink/50">
                {supplierOptions.find((s) => s.id === day.supplierId)?.name ?? "Supplier"}
              </p>
            )}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {days.map((day, index) => (
          <div key={index} className="grid grid-cols-1 gap-2 rounded-card border border-line bg-paper p-3 sm:grid-cols-[3.5rem_1fr_1fr_auto]">
            <input
              type="number"
              min="1"
              value={day.dayNumber}
              onChange={(e) => updateDay(index, { dayNumber: Number(e.target.value) })}
              className="rounded-card border border-line px-2 py-1.5 text-center text-sm text-ink outline-none focus-visible:border-wine"
              aria-label="Day number"
            />
            <div className="space-y-1">
              <input
                type="text"
                required
                placeholder="Title (e.g. Winery visit)"
                value={day.title}
                onChange={(e) => updateDay(index, { title: e.target.value })}
                className="w-full rounded-card border border-line px-3 py-1.5 text-sm text-ink outline-none focus-visible:border-wine"
              />
              <textarea
                placeholder="Details (optional)"
                value={day.description}
                onChange={(e) => updateDay(index, { description: e.target.value })}
                className="w-full rounded-card border border-line px-3 py-1.5 text-sm text-ink outline-none focus-visible:border-wine"
                rows={2}
              />
              <input
                type="text"
                placeholder="Time (optional, e.g. 14:00)"
                value={day.timeOfDay}
                onChange={(e) => updateDay(index, { timeOfDay: e.target.value })}
                className="w-full rounded-card border border-line px-3 py-1.5 text-sm text-ink outline-none focus-visible:border-wine"
              />
            </div>
            <select
              value={day.supplierId ?? ""}
              onChange={(e) => updateDay(index, { supplierId: e.target.value || null })}
              className="h-fit rounded-card border border-line px-3 py-1.5 text-sm text-ink outline-none focus-visible:border-wine"
            >
              <option value="">No supplier tagged</option>
              {supplierOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeDay(index)}
              className="h-fit rounded-card border border-line bg-white px-2 py-1.5 text-xs font-semibold text-wine transition hover:border-wine"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addDay}
          className="rounded-card border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-wine"
        >
          + Add day
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-card bg-wine px-4 py-2 text-sm font-semibold text-paper transition hover:bg-wine-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save program"}
        </button>
        {message && <p className="text-sm text-wine">{message}</p>}
      </div>
    </div>
  );
}
