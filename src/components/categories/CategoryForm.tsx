"use client";

import { useState } from "react";
import { createCategory } from "@/actions/categories";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CategoryForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    const result = await createCategory(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          カテゴリを追加しました
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="cat-name">カテゴリ名</Label>
        <Input id="cat-name" name="name" placeholder="例: 消耗品費" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cat-type">種別</Label>
        <select
          id="cat-type"
          name="type"
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">選択してください</option>
          <option value="EXPENSE">支出</option>
          <option value="INCOME">収入</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cat-debit">借方勘定科目（任意）</Label>
        <Input id="cat-debit" name="debitAccount" placeholder="例: 消耗品費" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cat-credit">貸方勘定科目（任意）</Label>
        <Input id="cat-credit" name="creditAccount" placeholder="例: 売上高" />
      </div>

      <button
        type="submit"
        className="w-full bg-gray-900 text-white font-medium py-2.5 rounded-lg hover:bg-gray-700 transition-colors text-sm"
      >
        カテゴリを追加する
      </button>
    </form>
  );
}
