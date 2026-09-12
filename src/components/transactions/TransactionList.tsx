"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteTransaction,
  getTransactionPhoto,
  updateTransaction,
  updateTransactionPhoto,
} from "@/actions/transactions";
import { formatCurrency, formatDate, getTransactionTypeLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { PhotoInput } from "./PhotoInput";
import { Image as ImageIcon, Loader2, X } from "lucide-react";
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
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>("");
  const [editType, setEditType] = useState<string>("");
  const [editCategoryId, setEditCategoryId] = useState<string>("");
  const [editFromAccountId, setEditFromAccountId] = useState<string>("");
  const [editToAccountId, setEditToAccountId] = useState<string>("");
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const [isPhotoDirty, setIsPhotoDirty] = useState(false);
  const [isLoadingEditPhoto, setIsLoadingEditPhoto] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [isLoadingView, setIsLoadingView] = useState(false);
  const [isSaving, startSave] = useTransition();

  const editTouchesCash =
    accounts.find((a) => a.id === editFromAccountId)?.type === "CASH" ||
    accounts.find((a) => a.id === editToAccountId)?.type === "CASH";

  async function startEdit(t: TransactionWithRelations) {
    setEditingId(t.id);
    setEditDate(new Date(t.date).toISOString().slice(0, 10));
    setEditType(t.type);
    setEditCategoryId(t.category?.id ?? "");
    setEditFromAccountId(t.fromAccount?.id ?? "");
    setEditToAccountId(t.toAccount?.id ?? "");
    setEditPhoto(null);
    setIsPhotoDirty(false);

    // 写真の実データは一覧に含まれていないため編集開始時に取得する
    if (t.hasPhoto) {
      setIsLoadingEditPhoto(true);
      const result = await getTransactionPhoto(t.id);
      if (result.photoData) setEditPhoto(result.photoData);
      setIsLoadingEditPhoto(false);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditPhoto(null);
    setIsPhotoDirty(false);
  }

  function saveEdit(id: string) {
    startSave(async () => {
      await updateTransaction(id, {
        date: editDate || undefined,
        type: editType,
        categoryId: editCategoryId || null,
        fromAccountId: editFromAccountId || null,
        toAccountId: editToAccountId || null,
      });
      // 写真は変更されたときだけ書き込む
      if (isPhotoDirty) {
        await updateTransactionPhoto(id, editPhoto);
      }
      setEditingId(null);
      setEditPhoto(null);
      setIsPhotoDirty(false);
      router.refresh();
    });
  }

  async function openPhoto(id: string) {
    setIsLoadingView(true);
    setViewingPhoto(null);
    const result = await getTransactionPhoto(id);
    if (result.photoData) setViewingPhoto(result.photoData);
    setIsLoadingView(false);
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
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer select-none hover:text-gray-800"
                  onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
                >
                  日付 {sortOrder === "desc" ? "↓" : "↑"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">種別</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">内容</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">口座</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">カテゴリ</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">金額</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...transactions]
                .sort((a, b) => {
                  const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
                  return sortOrder === "desc" ? -diff : diff;
                })
                .map((t) => {
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
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {editingId === t.id ? (
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="h-7 rounded border border-input bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      ) : (
                        formatDate(t.date)
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === t.id ? (
                        <select
                          value={editType}
                          onChange={(e) => { setEditType(e.target.value); setEditCategoryId(""); setEditFromAccountId(""); setEditToAccountId(""); }}
                          className="h-7 rounded border border-input bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="EXPENSE">支出</option>
                          <option value="INCOME">収入</option>
                          <option value="TRANSFER">振替</option>
                        </select>
                      ) : (
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", typeBadgeColors[t.type])}>
                          {getTransactionTypeLabel(t.type)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-800 max-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{t.description}</span>
                        {t.hasPhoto && editingId !== t.id && (
                          <button
                            onClick={() => openPhoto(t.id)}
                            title="写真を見る"
                            className="shrink-0 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <ImageIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {editingId === t.id && editTouchesCash && (
                        <div className="mt-2">
                          {isLoadingEditPhoto ? (
                            <span className="flex items-center gap-1.5 text-xs text-gray-400">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              写真を読み込み中…
                            </span>
                          ) : (
                            <PhotoInput
                              compact
                              value={editPhoto}
                              onChange={(dataUrl) => { setEditPhoto(dataUrl); setIsPhotoDirty(true); }}
                            />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {editingId === t.id ? (
                        <span className="flex flex-col gap-1">
                          {(editType === "EXPENSE" || editType === "TRANSFER") && (
                            <select
                              value={editFromAccountId}
                              onChange={(e) => setEditFromAccountId(e.target.value)}
                              className="h-7 rounded border border-input bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              <option value="">出金口座</option>
                              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                          )}
                          {(editType === "INCOME" || editType === "TRANSFER") && (
                            <select
                              value={editToAccountId}
                              onChange={(e) => setEditToAccountId(e.target.value)}
                              className="h-7 rounded border border-input bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              <option value="">入金口座</option>
                              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                          )}
                        </span>
                      ) : (
                        accountLabel ?? "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {editingId === t.id ? (
                        editType === "TRANSFER" ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <select
                            value={editCategoryId}
                            onChange={(e) => setEditCategoryId(e.target.value)}
                            className="h-7 rounded border border-input bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="">未分類</option>
                            {categories.filter((c) => c.type === editType).map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        )
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
                            onClick={() => saveEdit(t.id)}
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

      {/* 写真の拡大表示 */}
      {(viewingPhoto || isLoadingView) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => { setViewingPhoto(null); setIsLoadingView(false); }}
        >
          {isLoadingView ? (
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          ) : (
            <div className="relative max-h-full" onClick={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewingPhoto!}
                alt="添付写真"
                className="max-h-[85vh] max-w-full rounded-lg object-contain"
              />
              <button
                onClick={() => setViewingPhoto(null)}
                className="absolute -right-3 -top-3 rounded-full bg-white p-1.5 text-gray-700 shadow hover:bg-gray-100 transition-colors"
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
