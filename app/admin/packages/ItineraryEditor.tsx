"use client";

import type { ItineraryDayInput } from "./actions";

export function ItineraryEditor({
  days,
  onChange,
}: {
  days: ItineraryDayInput[];
  onChange: (days: ItineraryDayInput[]) => void;
}) {
  function addDay() {
    const nextDayNumber = days.length > 0 ? Math.max(...days.map((d) => d.dayNumber)) + 1 : 1;
    onChange([...days, { dayNumber: nextDayNumber, title: "", description: "" }]);
  }

  function updateDay(index: number, patch: Partial<ItineraryDayInput>) {
    onChange(days.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function removeDay(index: number) {
    onChange(days.filter((_, i) => i !== index));
  }

  return (
    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-ink">
        Day-by-day itinerary ({days.length} day{days.length === 1 ? "" : "s"})
      </label>

      <div className="mt-2 space-y-2">
        {days.map((day, index) => (
          <div
            key={index}
            className="grid grid-cols-[3.5rem_1fr_auto] gap-2 rounded-card border border-line bg-paper p-2"
          >
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
                placeholder="Day title (e.g. Arrival & check-in)"
                value={day.title}
                onChange={(e) => updateDay(index, { title: e.target.value })}
                className="w-full rounded-card border border-line px-3 py-1.5 text-sm text-ink outline-none focus-visible:border-wine"
              />
              <textarea
                placeholder="Details for this day (optional)"
                value={day.description}
                onChange={(e) => updateDay(index, { description: e.target.value })}
                className="w-full rounded-card border border-line px-3 py-1.5 text-sm text-ink outline-none focus-visible:border-wine"
                rows={2}
              />
            </div>
            <button
              type="button"
              onClick={() => removeDay(index)}
              className="self-start rounded-card border border-line bg-white px-2 py-1.5 text-xs font-semibold text-wine transition hover:border-wine"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addDay}
        className="mt-2 rounded-card border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-wine"
      >
        + Add day
      </button>
    </div>
  );
}
