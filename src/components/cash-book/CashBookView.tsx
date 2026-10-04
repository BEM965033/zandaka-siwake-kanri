"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getTransactionPhoto } from "@/actions/transactions";
import type { CashBook } from "@/actions/cashbook";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { BalanceChart } from "./BalanceChart";
import { FileDown, Image as ImageIcon, Loader2, X } from "lucide-react";

interface Props {
  cashAccounts: { id: string; name: string }[];
  accountId: string;
  dateFrom: string;
  dateTo: string;
  today: string;
  book: CashBook | null;
  error: string | null;
}

const inputClass =
  "flex h-9 rounded-md border border-input bg-white px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// yyyy-mm-dd の月末日
function endOfMonth(y: number, m: number) {
  return `${y}-${pad(m)}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`;
}

function buildPresets(today: string) {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  return [
    { label: "今月", from: `${y}-${pad(m)}-01`, to: today },
    { label: "先月", from: `${prevY}-${pad(prevM)}-01`, to: endOfMonth(prevY, prevM) },
    { label: "今年", from: `${y}-01-01`, to: today },
    { label: "昨年", from: `${y - 1}-01-01`, to: `${y - 1}-12-31` },
  ];
}

function formatPeriod(from: string, to: string) {
  return `${formatDate(from)} 〜 ${formatDate(to)}`;
}

export function CashBookView({ cashAccounts, accountId, dateFrom, dateTo, today, book, error }: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState({ accountId, dateFrom, dateTo });
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [isLoadingView, setIsLoadingView] = useState(false);
  const presets = buildPresets(today);

  function apply(next: typeof filters) {
    setFilters(next);
    const params = new URLSearchParams(next);
    router.push(`/cash-book?${params.toString()}`);
  }

  // ブラウザの印刷ダイアログから「PDFに保存」する。保存時のファイル名にtitleが使われる
  function handlePrint() {
    if (!book) return;
    const original = document.title;
    document.title = `現金出納帳_${book.account.name}_${book.dateFrom}_${book.dateTo}`;
    window.addEventListener("afterprint", () => { document.title = original; }, { once: true });
    window.print();
  }

  async function openPhoto(id: string) {
    setIsLoadingView(true);
    setViewingPhoto(null);
    const result = await getTransactionPhoto(id);
    if (result.photoData) setViewingPhoto(result.photoData);
    setIsLoadingView(false);
  }

  const balanceTone = (v: string) => (Number(v) < 0 ? "text-red-600" : "text-gray-900");

  return (
    <div>
      <div className="flex items-center justify-between mb-5 print:hidden">
        <h1 className="text-lg font-semibold text-gray-900">現金出納帳</h1>
        <button
          onClick={handlePrint}
          disabled={!book}
          className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <FileDown className="w-4 h-4" />
          PDFで保存
        </button>
      </div>

      {/* 条件 */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 mb-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {cashAccounts.length > 1 && (
            <select
              value={filters.accountId}
              onChange={(e) => apply({ ...filters, accountId: e.target.value })}
              className={inputClass}
            >
              {cashAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            className={inputClass}
          />
          <span className="text-sm text-gray-400">〜</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className={inputClass}
          />
          <button
            onClick={() => apply(filters)}
            disabled={!filters.dateFrom || !filters.dateTo}
            className="bg-gray-900 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            表示
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {presets.map((p) => {
            const active = p.from === dateFrom && p.to === dateTo;
            return (
              <button
                key={p.label}
                onClick={() => apply({ ...filters, dateFrom: p.from, dateTo: p.to })}
                className={cn(
                  "text-xs px-3 py-1 rounded-full border transition-colors",
                  active
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="bg-white rounded-xl border border-red-200 px-5 py-4 text-sm text-red-600">{error}</p>
      )}

      {book && (
        <>
          {/* 印刷時の見出し */}
          <div className="hidden print:block mb-4">
            <h1 className="text-xl font-bold text-center tracking-widest">現金出納帳</h1>
            <div className="mt-3 flex justify-between text-xs text-gray-700">
              <span>口座: {book.account.name}</span>
              <span>期間: {formatPeriod(book.dateFrom, book.dateTo)}</span>
              <span>出力日: {formatDate(today)}</span>
            </div>
          </div>

          {/* サマリー */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 print:grid-cols-4 print:gap-2">
            {[
              { label: "前期繰越", value: book.openingBalance, tone: balanceTone(book.openingBalance) },
              { label: "入金合計", value: book.totalIncome, tone: "text-green-600", sign: "+" },
              { label: "出金合計", value: book.totalExpense, tone: "text-red-600", sign: "-" },
              { label: "次期繰越", value: book.closingBalance, tone: balanceTone(book.closingBalance) },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-xl border border-gray-200 px-4 py-3 print:rounded-none print:px-3 print:py-2"
              >
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={cn("mt-1 text-lg font-bold tabular-nums print:text-base", s.tone)}>
                  {s.sign && Number(s.value) > 0 ? s.sign : ""}
                  {formatCurrency(s.value)}
                </p>
              </div>
            ))}
          </div>

          {/* 残高推移 */}
          {book.rows.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 mb-4 print:hidden">
              <p className="text-xs font-medium text-gray-500 mb-2">残高の推移</p>
              <BalanceChart
                dateFrom={book.dateFrom}
                dateTo={book.dateTo}
                openingBalance={book.openingBalance}
                rows={book.rows}
              />
            </div>
          )}

          {/* 出納帳 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden print:rounded-none print:overflow-visible">
            <p className="px-5 py-3 text-xs text-gray-500 border-b border-gray-100 print:hidden">
              {book.account.name}・{formatPeriod(book.dateFrom, book.dateTo)}・{book.rows.length}件
            </p>
            <table className="w-full text-sm print:text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 w-28 print:px-2">日付</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 print:px-2">摘要</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 print:px-2">相手科目</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 w-28 print:px-2">入金</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 w-28 print:px-2">出金</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 w-32 print:px-2">残高</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="bg-gray-50/60 break-inside-avoid">
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap print:px-2">{formatDate(book.dateFrom)}</td>
                  <td className="px-4 py-2.5 text-gray-500 print:px-2" colSpan={4}>前期繰越</td>
                  <td className={cn("px-4 py-2.5 text-right tabular-nums font-medium whitespace-nowrap print:px-2", balanceTone(book.openingBalance))}>
                    {formatCurrency(book.openingBalance)}
                  </td>
                </tr>
                {book.rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                      この期間の取引はありません
                    </td>
                  </tr>
                )}
                {book.rows.map((r, i) => {
                  const sameDay = i > 0 && formatDate(book.rows[i - 1].date) === formatDate(r.date);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 break-inside-avoid">
                      <td className={cn("px-4 py-2.5 whitespace-nowrap print:px-2", sameDay ? "text-gray-300 print:text-gray-500" : "text-gray-600")}>
                        {formatDate(r.date)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-800 print:px-2">
                        <div className="flex items-center gap-2">
                          <span>{r.description}</span>
                          {r.hasPhoto && (
                            <button
                              onClick={() => openPhoto(r.id)}
                              title="写真を見る"
                              className="shrink-0 text-gray-400 hover:text-blue-600 transition-colors print:hidden"
                            >
                              <ImageIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        {r.memo && <p className="text-xs text-gray-400 mt-0.5">{r.memo}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 print:px-2">{r.counterpart}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap text-green-600 print:text-gray-900 print:px-2">
                        {Number(r.income) > 0 ? formatCurrency(r.income) : ""}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap text-red-600 print:text-gray-900 print:px-2">
                        {Number(r.expense) > 0 ? formatCurrency(r.expense) : ""}
                      </td>
                      <td className={cn("px-4 py-2.5 text-right tabular-nums font-medium whitespace-nowrap print:px-2", balanceTone(r.balance))}>
                        {formatCurrency(r.balance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-gray-300">
                <tr className="break-inside-avoid">
                  <td className="px-4 py-2.5 text-gray-500 print:px-2" colSpan={3}>合計</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium text-green-600 whitespace-nowrap print:text-gray-900 print:px-2">
                    {formatCurrency(book.totalIncome)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium text-red-600 whitespace-nowrap print:text-gray-900 print:px-2">
                    {formatCurrency(book.totalExpense)}
                  </td>
                  <td></td>
                </tr>
                <tr className="bg-gray-50/60 break-inside-avoid">
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap print:px-2">{formatDate(book.dateTo)}</td>
                  <td className="px-4 py-2.5 text-gray-500 print:px-2" colSpan={4}>次期繰越</td>
                  <td className={cn("px-4 py-2.5 text-right tabular-nums font-bold whitespace-nowrap print:px-2", balanceTone(book.closingBalance))}>
                    {formatCurrency(book.closingBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {/* 写真の拡大表示 */}
      {(viewingPhoto || isLoadingView) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 print:hidden"
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
