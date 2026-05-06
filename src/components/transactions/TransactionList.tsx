"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTransaction, updateTransactionCategory } from "@/actions/transactions";
import { formatCurrency, formatDate, getTransactionTypeLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { TransactionWithRelations, AccountType, CategoryType } from "@/types";

interface Props {
  transactions: TransactionWithRelations[];
  accounts: { id: string; name: string; type: AccountType }[];
  categories: { id: string; name: string; type: CategoryType }[];
  currentFilters: Record<string, string>;
}

const typeBadgeColors: Record<string, string> = {
  EXPENSE: "bg-red-100 text-red-700",
  INCOME: "bg-green-100 text-green-700",
  TRANSFER: "bg-blue-100 text-blue-700",
};

export function TransactionList({ transactions, accounts, categories, currentFilters }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategoryId, setEditCategoryId] = useState<string>("");
  const [isSaving, startSave] = useTransition();

  function startEdit(t: TransactionWithRelations) {
    setEditingId(t.id);
    setEditCategoryId(t.category?.id ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditCategoryId("");
  }

  function saveCategory(id: string) {
    startSave(async () => {
      await updateTransactionCategory(id, editCategoryId || null);
      setEditingId(null);
      router.refresh();
    });
  }

  const [filters, setFilters] = useState({
    type: currentFilters.type ?? "ALL",
    accountId: currentFilters.accountId ?? "ALL",
    categoryId: currentFilters.categoryId ?? "ALL",
    dateFrom: currentFilters.dateFrom ?? "",
    dateTo: currentFilters.dateTo ?? "",
  });

  function applyFilters() {
    const params = new URLSearchParams();
    if (filters.type !== "ALL") params.set("type", filters.type);
    if (filters.accountId !== "ALL") params.set("accountId", filters.accountId);
    if (filters.categoryId !== "ALL") params.set("categoryId", filters.categoryId);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    router.push(`/transactions?${params.toString()}`);
  }

  async function handleDelete(id: string) {
    if (!confirm("この取引を削除しますか？残高も元に戻ります。")) return;
    await deleteTransaction(id);
    router.refresh();
  }

  return (
    <div>
      {/* フィルター */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">種別: すべて</option>
            <option value="EXPENSE">支出</option>
            <option value="INCOME">収入</option>
            <option value="TRANSFER">振替</option>
          </select>

          <select
            value={filters.accountId}
            onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">口座: すべて</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <select
            value={filters.categoryId}
            onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">カテゴリ: すべて</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={applyFilters}
            className="bg-gray-900 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            絞り込む
          </button>
          <button
            onClick={() => {
              setFilters({ type: "ALL", accountId: "ALL", categoryId: "ALL", dateFrom: "", dateTo: "" });
              router.push("/transactions");
            }}
            className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            リセット
          </button>
        </div>
      </div>

      {/* 一覧 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {transactions.length === 0 ? (
          <p className="px-5 py-12 text-sm text-gray-400 text-center">
            該当する取引がありません
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">日付</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">種別</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">内容</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">口座</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">カテゴリ</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">金額</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map((t) => {
                const amount = Number(t.amount);
                const sign = t.type === "EXPENSE" ? "-" : t.type === "INCOME" ? "+" : "";
                const accountLabel =
                  t.type === "TRANSFER"
                    ? `${t.fromAccount?.name ?? "?"} → ${t.toAccount?.name ?? "?"}`
                    : t.type === "EXPENSE"
                    ? t.fromAccount?.name
                    : t.toAccount?.name;

                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", typeBadgeColors[t.type])}>
                        {getTransactionTypeLabel(t.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-800 max-w-[200px] truncate">{t.description}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{accountLabel ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {editingId === t.id ? (
                        <select
                          value={editCategoryId}
                          onChange={(e) => setEditCategoryId(e.target.value)}
                          className="h-7 rounded border border-input bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">未分類</option>
                          {categories.filter((c) => c.type === t.type).map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      ) : (
                        t.category?.name ?? <span className="text-yellow-600 text-xs">未分類</span>
                      )}
                    </td>
                    <td className={cn(
                      "px-4 py-3 text-right font-bold tabular-nums whitespace-nowrap",
                      t.type === "EXPENSE" ? "text-red-600" : t.type === "INCOME" ? "text-green-600" : "text-blue-600"
                    )}>
                      {sign}{formatCurrency(amount)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {editingId === t.id ? (
                        <span className="flex gap-2 justify-end">
                          <button
                            onClick={() => saveCategory(t.id)}
                            disabled={isSaving}
                            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {isSaving ? "保存中…" : "保存"}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            キャンセル
                          </button>
                        </span>
                      ) : (
                        <span className="flex gap-2 justify-end">
                          <button
                            onClick={() => startEdit(t)}
                            className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                          >
                            削除
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
