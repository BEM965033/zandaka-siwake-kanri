import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | bigint): string {
  const num = typeof amount === "bigint" ? Number(amount) : Number(amount);
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function getAccountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    CASH: "手元現金",
    LOCAL_BANK: "地方銀行",
    NET_BANK: "ネット銀行",
    OTHER: "その他",
  };
  return labels[type] ?? type;
}

export function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    EXPENSE: "支出",
    INCOME: "収入",
    TRANSFER: "振替",
  };
  return labels[type] ?? type;
}

export function getAccountLedgerName(type: string): string {
  const names: Record<string, string> = {
    CASH: "現金",
    LOCAL_BANK: "普通預金",
    NET_BANK: "普通預金",
    OTHER: "預金",
  };
  return names[type] ?? "預金";
}
