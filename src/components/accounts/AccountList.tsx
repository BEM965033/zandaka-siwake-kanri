"use client";

import { useState } from "react";
import { deleteAccount, updateInitialBalance } from "@/actions/accounts";
import { formatCurrency, getAccountTypeLabel } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { AccountWithBalance } from "@/types";

export function AccountList({ accounts }: { accounts: AccountWithBalance[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleDelete(id: string) {
    if (!confirm("この口座を無効化しますか？")) return;
    await deleteAccount(id);
    router.refresh();
  }

  function startEdit(a: AccountWithBalance) {
    setError(null);
    setEditingId(a.id);
    setEditValue(a.initialBalance ?? "0");
  }

  async function handleSave(id: string) {
    setSaving(true);
    setError(null);
    const result = await updateInitialBalance(id, editValue);
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border-b border-red-200 px-4 py-2">{error}</div>
      )}
      {accounts.length === 0 ? (
        <p className="px-5 py-8 text-sm text-gray-400 text-center">口座が登録されていません</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">口座名</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">種別</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">現在残高</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">初期残高</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {accounts.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{a.name}</td>
                <td className="px-4 py-3 text-gray-600">{getAccountTypeLabel(a.type)}</td>
                <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-900">
                  {formatCurrency(Number(a.balance))}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-400">
                  {editingId === a.id ? (
                    <input
                      type="number"
                      min={0}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave(a.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="w-28 h-8 rounded-md border border-gray-300 px-2 text-right text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  ) : (
                    formatCurrency(Number(a.initialBalance ?? 0))
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap space-x-3">
                  {editingId === a.id ? (
                    <>
                      <button
                        onClick={() => handleSave(a.id)}
                        disabled={saving}
                        className="text-xs font-medium text-gray-900 hover:text-gray-600 disabled:opacity-50"
                      >
                        {saving ? "保存中…" : "保存"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        キャンセル
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(a)}
                        className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
                      >
                        初期残高を変更
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                      >
                        無効化
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
