"use client";

import { useRef, useState } from "react";
import { createExpense } from "@/actions/transactions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AccountWithBalance, CategoryOption } from "@/types";

interface Props {
  accounts: AccountWithBalance[];
  categories: CategoryOption[];
}

export function ExpenseForm({ accounts, categories }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    const result = await createExpense(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      formRef.current?.reset();
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          支出を記録しました
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="expense-date">日付</Label>
          <Input id="expense-date" name="date" type="date" defaultValue={today} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expense-amount">金額（円）</Label>
          <Input id="expense-amount" name="amount" type="number" min={1} placeholder="0" required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="expense-account">支払口座</Label>
        <select
          id="expense-account"
          name="fromAccountId"
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">口座を選択</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="expense-category">カテゴリ</Label>
        <select
          id="expense-category"
          name="categoryId"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">カテゴリを選択（任意）</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="expense-description">内容</Label>
        <Input id="expense-description" name="description" placeholder="例: 消耗品購入" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="expense-memo">メモ（任意）</Label>
        <Textarea id="expense-memo" name="memo" placeholder="メモを入力" rows={2} />
      </div>

      <button
        type="submit"
        className="w-full bg-red-600 text-white font-medium py-2.5 rounded-lg hover:bg-red-700 transition-colors text-sm"
      >
        支出を記録する
      </button>
    </form>
  );
}
