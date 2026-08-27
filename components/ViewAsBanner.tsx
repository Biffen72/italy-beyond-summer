import { clearViewAs } from "@/app/admin/view-as/actions";

export function ViewAsBanner({ label, type }: { label: string; type: "agency" | "supplier" }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-wine bg-wine px-6 py-2 text-sm text-paper md:px-12">
      <span>
        Viewing as {type === "agency" ? "customer" : "supplier"}: <strong>{label}</strong>{" "}
        (admin preview)
      </span>
      <form action={clearViewAs}>
        <button type="submit" className="font-semibold underline">
          Exit view → backoffice
        </button>
      </form>
    </div>
  );
}
