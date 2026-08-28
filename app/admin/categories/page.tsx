import { createClient } from "@/lib/supabase/server";
import { CategoryForm } from "./CategoryForm";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, kind, value, label, icon, show_on_homepage, sort_order")
    .order("sort_order");

  const packageCategories = (categories ?? []).filter((c) => c.kind === "package");
  const supplierCategories = (categories ?? []).filter((c) => c.kind === "supplier");

  return (
    <section className="px-6 py-10 md:px-12">
      <h1 className="text-2xl font-semibold text-ink">Categories</h1>
      <p className="mt-1 text-ink/60">
        Manage the package themes and supplier categories used across the
        site — add new ones here instead of asking for a code change.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CategoryForm kind="package" categories={packageCategories} />
        <CategoryForm kind="supplier" categories={supplierCategories} />
      </div>
    </section>
  );
}
