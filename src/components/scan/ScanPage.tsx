"use client";

import { useState, useTransition, useRef } from "react";
import { scanImage, bulkCreateTransactions } from "@/actions/scan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { AccountWithBalance, CategoryOption, ScannedItem } from "@/types";
import { Upload, ScanLine, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface Props {
  accounts: AccountWithBalance[];
  categories: CategoryOption[];
}

interface EditableItem extends ScannedItem {
  id: string;
  selected: boolean;
}

export function ScanPage({ accounts, categories }: Props) {
  const [accountId, setAccountId] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isScanning, startScan] = useTransition();
  const [isRegistering, startRegister] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setItems([]);
    setError(null);
    setSuccessMsg(null);
  }

  function handleScan() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    setError(null);
    setSuccessMsg(null);
    startScan(async () => {
      const result = await scanImage(formData);
      if ("error" in result) {
        setError(result.error ?? "エラーが発生しました");
        return;
      }
      setItems(result.items.map((item, i) => ({ ...item, id: String(i), selected: true })));
    });
  }

  function toggleSelect(id: string) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, selected: !it.selected } : it));
  }

  function toggleAll() {
    const allSelected = items.every((it) => it.selected);
    setItems((prev) => prev.map((it) => ({ ...it, selected: !allSelected })));
  }

  function updateItem(id: string, field: keyof ScannedItem, value: string | number) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, [field]: value } : it));
  }

  function handleRegister() {
    const selected = items.filter((it) => it.selected);
    if (!accountId) { setError("口座を選択してください"); return; }
    setError(null);
    startRegister(async () => {
      const result = await bulkCreateTransactions(selected, accountId);
      if ("error" in result) {
        setError(result.error ?? "エラーが発生しました");
        return;
      }
      setSuccessMsg(`${result.count}件の取引を登録しました`);
      setItems([]);
      setPreviewUrl(null);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  const selectedCount = items.filter((it) => it.selected).length;
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");
  const incomeCategories = categories.filter((c) => c.type === "INCOME");

  return (
    <div className="space-y-5">
      {/* 口座選択 */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <div className="space-y-1.5">
          <Label>対象口座</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="口座を選択" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 画像アップロード */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <form ref={formRef}>
          <div
            className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="通帳プレビュー" className="max-h-64 mx-auto rounded object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <Upload className="w-10 h-10" />
                <p className="text-sm">クリックして画像を選択</p>
                <p className="text-xs">JPEG / PNG / WebP 対応</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            name="image"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
        </form>

        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={handleScan}
            disabled={!previewUrl || isScanning || !accountId}
            className="gap-2"
          >
            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
            {isScanning ? "読み取り中…" : "スキャン"}
          </Button>
          {!accountId && <p className="text-xs text-amber-600">先に口座を選択してください</p>}
        </div>
      </div>

      {/* エラー */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* 成功 */}
      {successMsg && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* 抽出結果 */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">
              抽出結果 <span className="text-gray-400 font-normal">{items.length}件</span>
            </h2>
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {items.every((it) => it.selected) ? "全解除" : "全選択"}
            </Button>
          </div>

          <div className="divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item.id} className={`flex items-start gap-3 px-6 py-3 ${!item.selected ? "opacity-40" : ""}`}>
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={() => toggleSelect(item.id)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 accent-blue-600"
                />
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-5 gap-2 min-w-0">
                  <Input
                    type="date"
                    value={item.date}
                    onChange={(e) => updateItem(item.id, "date", e.target.value)}
                    className="text-sm h-8"
                  />
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    className="text-sm h-8 sm:col-span-2"
                    placeholder="摘要"
                  />
                  <Input
                    type="number"
                    value={item.amount}
                    onChange={(e) => updateItem(item.id, "amount", Number(e.target.value))}
                    className="text-sm h-8"
                    min={1}
                  />
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={item.type === "EXPENSE" ? "destructive" : "default"}
                      className="cursor-pointer select-none text-xs"
                      onClick={() => updateItem(item.id, "type", item.type === "EXPENSE" ? "INCOME" : "EXPENSE")}
                    >
                      {item.type === "EXPENSE" ? "支出" : "収入"}
                    </Badge>
                    <Select
                      value={item.categoryId ?? "none"}
                      onValueChange={(v) => updateItem(item.id, "categoryId", v === "none" ? "" : v)}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="カテゴリ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">未分類</SelectItem>
                        {(item.type === "EXPENSE" ? expenseCategories : incomeCategories).map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-500">{selectedCount}件を登録</p>
            <Button
              onClick={handleRegister}
              disabled={selectedCount === 0 || isRegistering}
              className="gap-2"
            >
              {isRegistering ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isRegistering ? "登録中…" : `${selectedCount}件を登録`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
