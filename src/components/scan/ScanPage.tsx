"use client";

import { useState, useTransition, useRef } from "react";
import { parseCsvFile, parsePdfFile, bulkCreateTransactions } from "@/actions/scan";
import { parseOcrText } from "@/lib/ocr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { AccountWithBalance, CategoryOption, ScannedItem } from "@/types";
import { Upload, FileSpreadsheet, ScanLine, FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface Props {
  accounts: AccountWithBalance[];
  categories: CategoryOption[];
}

interface EditableItem extends ScannedItem {
  id: string;
  selected: boolean;
}

type Mode = "csv" | "pdf" | "image";

export function ScanPage({ accounts, categories }: Props) {
  const [mode, setMode] = useState<Mode>("csv");
  const [accountId, setAccountId] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [, startProcess] = useTransition();
  const [isRegistering, startRegister] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function resetState() {
    setItems([]);
    setError(null);
    setSuccessMsg(null);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (mode === "image") setPreviewUrl(URL.createObjectURL(file));
    setItems([]);
    setError(null);
    setSuccessMsg(null);
  }

  async function handleProcess() {
    setError(null);
    setSuccessMsg(null);

    if (mode === "csv" || mode === "pdf") {
      if (!formRef.current) return;
      const formData = new FormData(formRef.current);
      setIsProcessing(true);
      startProcess(async () => {
        const result = mode === "csv" ? await parseCsvFile(formData) : await parsePdfFile(formData);
        setIsProcessing(false);
        if ("error" in result) { setError(result.error ?? "エラーが発生しました"); return; }
        setItems(result.items.map((item, i) => ({ ...item, id: String(i), selected: true })));
      });
    } else {
      const file = fileRef.current?.files?.[0];
      if (!file) { setError("画像を選択してください"); return; }
      setIsProcessing(true);
      try {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("jpn", 1, {
          workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/worker.min.js",
          langPath: "https://tessdata.projectnaptha.com/4.0.0",
          corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd-lstm.wasm.js",
        });
        const { data: { text } } = await worker.recognize(file);
        await worker.terminate();
        const parsed = parseOcrText(text);
        if (parsed.length === 0) { setError("取引データを読み取れませんでした。画像を確認してください。"); }
        else { setItems(parsed.map((item, i) => ({ ...item, id: String(i), selected: true }))); }
      } catch (e) {
        console.error(e);
        setError("OCR処理に失敗しました");
      } finally {
        setIsProcessing(false);
      }
    }
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
      resetState();
    });
  }

  const selectedCount = items.filter((it) => it.selected).length;
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");
  const incomeCategories = categories.filter((c) => c.type === "INCOME");

  const csvInputName = "csv";
  const imageInputName = "image";

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

      {/* モード切替タブ */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => { setMode("csv"); resetState(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === "csv" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          CSV
        </button>
        <button
          onClick={() => { setMode("pdf"); resetState(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === "pdf" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <FileText className="w-4 h-4" />
          PDF
        </button>
        <button
          onClick={() => { setMode("image"); resetState(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === "image" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <ScanLine className="w-4 h-4" />
          画像スキャン
        </button>
      </div>

      {/* ファイルアップロード */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <form ref={formRef}>
          {mode === "pdf" ? (
          <div
            className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <FileText className="w-10 h-10" />
              {fileRef.current?.files?.[0]
                ? <p className="text-sm text-gray-700">{fileRef.current.files[0].name}</p>
                : <>
                  <p className="text-sm">クリックしてPDFを選択</p>
                  <p className="text-xs">ネットバンキングの明細PDFに対応</p>
                </>
              }
            </div>
            <input
              ref={fileRef}
              type="file"
              name={csvInputName}
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : mode === "csv" ? (
            <div
              className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <FileSpreadsheet className="w-10 h-10" />
                {fileRef.current?.files?.[0]
                  ? <p className="text-sm text-gray-700">{fileRef.current.files[0].name}</p>
                  : <>
                    <p className="text-sm">クリックしてCSVを選択</p>
                    <p className="text-xs">銀行ネットバンキングからダウンロードしたCSV</p>
                  </>
                }
              </div>
              <input
                ref={fileRef}
                type="file"
                name={csvInputName}
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
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
                  <p className="text-xs">JPEG / PNG / WebP 対応（Gemini APIキー設定時のみ動作）</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                name={imageInputName}
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}
        </form>

        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={handleProcess}
            disabled={isProcessing || !accountId}
            className="gap-2"
          >
            {isProcessing
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : mode === "csv" ? <FileSpreadsheet className="w-4 h-4" /> : mode === "pdf" ? <FileText className="w-4 h-4" /> : <ScanLine className="w-4 h-4" />
            }
            {isProcessing ? "読み込み中…" : mode === "csv" ? "CSVを読み込む" : mode === "pdf" ? "PDFを読み込む" : "スキャン"}
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
              読み込み結果 <span className="text-gray-400 font-normal">{items.length}件</span>
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
                    type="text"
                    value={item.amount.toLocaleString("ja-JP")}
                    onChange={(e) => {
                      const raw = Number(e.target.value.replace(/,/g, ""));
                      if (!isNaN(raw)) updateItem(item.id, "amount", raw);
                    }}
                    className="text-sm h-8 text-right"
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
