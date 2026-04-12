"use client";

import { useState } from "react";
import { deleteAccount } from "@/actions/accounts";
import { formatCurrency, getAccountTypeLabel } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { AccountWithBalance } from "@/types";

export function AccountList({ accounts }: { accounts: AccountWithBalance[] }) {
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("この口座を無効化しますか？")) return;
    await deleteAccount(id);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                  {formatCurrency(Number(a.balance))}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                  >
                    無効化
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
