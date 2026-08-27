const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FOCUS = [false, false, false, true, true, true, false, false, true, true, true, false];

// The recurring "which months matter" visual from the pitch deck, carried onto
// the web platform so the two touchpoints feel like the same product.
export function SeasonStrip() {
  return (
    <div>
      <div className="flex gap-1.5">
        {MONTHS.map((m, i) => (
          <div
            key={m}
            className={`flex-1 rounded-md py-3 text-center text-xs font-semibold ${
              FOCUS[i] ? "bg-wine text-paper" : "bg-black/5 text-ink/50"
            }`}
          >
            {m}
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm italic text-ink/60">
        Peak focus months: April–June &amp; September–November
      </p>
    </div>
  );
}
