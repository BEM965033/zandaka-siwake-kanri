"use client";

import { useState } from "react";
import { createAccount } from "@/actions/accounts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  onSuccess?: () => void;
}

export function AccountForm({ onSuccess }: Props) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await createAccount(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      onSuccess?.();
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="account-name">口座名</Label>
        <Input id="account-name" name="name" placeholder="例: ○○銀行" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="account-type">口座種別</Label>
        <select
          id="account-type"
          name="type"
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">選択してください</option>
          <option value="CASH">手元現金</option>
          <option value="LOCAL_BANK">地方銀行</option>
          <option value="NET_BANK">ネット銀行</option>
          <option value="OTHER">その他</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="account-balance">初期残高（円）</Label>
        <Input id="account-balance" name="initialBalance" type="number" min={0} defaultValue={0} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="account-order">表示順</Label>
        <Input id="account-order" name="sortOrder" type="number" min={0} defaultValue={0} />
      </div>

      <button
        type="submit"
        className="w-full bg-gray-900 text-white font-medium py-2.5 rounded-lg hover:bg-gray-700 transition-colors text-sm"
      >
        口座を追加する
      </button>
    </form>
  );
}
