"use client";

import { deleteCategory } from "@/actions/categories";
import { useRouter } from "next/navigation";
import type { CategoryOption } from "@/types";

export function CategoryList({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("このカテゴリを無効化しますか？")) return;
    await deleteCategory(id);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {categories.length === 0 ? (
        <p className="px-5 py-8 text-sm text-gray-400 text-center">カテゴリが登録されていません</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">カテゴリ名</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">種別</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">借方</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">貸方</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    c.type === "EXPENSE" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                  }`}>
                    {c.type === "EXPENSE" ? "支出" : "収入"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{c.debitAccount ?? "-"}</td>
                <td className="px-4 py-3 text-gray-500">{c.creditAccount ?? "-"}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
