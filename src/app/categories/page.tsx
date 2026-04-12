import { getCategories } from "@/actions/categories";
import { CategoryList } from "@/components/categories/CategoryList";
import { CategoryForm } from "@/components/categories/CategoryForm";
import type { CategoryOption } from "@/types";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getCategories();

  const categoriesForClient: CategoryOption[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    debitAccount: c.debitAccount,
    creditAccount: c.creditAccount,
  }));

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-lg font-semibold text-gray-900 mb-5">カテゴリ設定</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CategoryList categories={categoriesForClient} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 px-5 py-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">カテゴリを追加</h2>
          <CategoryForm />
        </div>
      </div>
    </div>
  );
}
