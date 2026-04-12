import Link from "next/link";
import { formatCurrency, formatDate, getTransactionTypeLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TransactionWithRelations } from "@/types";

const typeBadgeColors: Record<string, string> = {
  EXPENSE: "bg-red-100 text-red-700 border-red-200",
  INCOME: "bg-green-100 text-green-700 border-green-200",
  TRANSFER: "bg-blue-100 text-blue-700 border-blue-200",
};

export function RecentTransactions({ transactions }: { transactions: TransactionWithRelations[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">最近の取引</h2>
        <Link href="/transactions" className="text-xs text-blue-600 hover:underline">
          すべて見る
        </Link>
      </div>
      {transactions.length === 0 ? (
        <p className="px-5 py-8 text-sm text-gray-400 text-center">取引データがありません</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {transactions.map((t) => {
            const amount = Number(t.amount);
            const sign = t.type === "EXPENSE" ? "-" : t.type === "INCOME" ? "+" : "";
            const accountName =
              t.type === "EXPENSE"
                ? t.fromAccount?.name
                : t.type === "INCOME"
                ? t.toAccount?.name
                : `${t.fromAccount?.name ?? "?"} → ${t.toAccount?.name ?? "?"}`;

            return (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full border font-medium shrink-0",
                    typeBadgeColors[t.type]
                  )}
                >
                  {getTransactionTypeLabel(t.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{t.description}</p>
                  <p className="text-xs text-gray-400">
                    {formatDate(t.date)} {accountName && `· ${accountName}`}
                    {t.category && ` · ${t.category.name}`}
                  </p>
                </div>
                <p
                  className={cn(
                    "text-sm font-bold tabular-nums shrink-0",
                    t.type === "EXPENSE" ? "text-red-600" : t.type === "INCOME" ? "text-green-600" : "text-blue-600"
                  )}
                >
                  {sign}{formatCurrency(amount)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
