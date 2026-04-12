"use client";

import { useRef, useState } from "react";
import { createTransfer } from "@/actions/transactions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AccountWithBalance } from "@/types";

interface Props {
  accounts: AccountWithBalance[];
}

export function TransferForm({ accounts }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    const result = await createTransfer(formData);
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
        <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          振替を記録しました。残高と仕訳が自動更新されました。
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="transfer-date">日付</Label>
          <Input id="transfer-date" name="date" type="date" defaultValue={today} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="transfer-amount">金額（円）</Label>
          <Input id="transfer-amount" name="amount" type="number" min={1} placeholder="0" required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="transfer-from">出金元口座</Label>
        <select
          id="transfer-from"
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
        <Label htmlFor="transfer-to">入金先口座</Label>
        <select
          id="transfer-to"
          name="toAccountId"
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
        <Label htmlFor="transfer-description">内容（任意）</Label>
        <Input id="transfer-description" name="description" placeholder="振替" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="transfer-memo">メモ（任意）</Label>
        <Textarea id="transfer-memo" name="memo" placeholder="メモを入力" rows={2} />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-xs text-blue-700">
        振替後、両口座の残高が自動更新され、仕訳（借方/貸方）が自動生成されます。
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm"
      >
        振替を記録する
      </button>
    </form>
  );
}
