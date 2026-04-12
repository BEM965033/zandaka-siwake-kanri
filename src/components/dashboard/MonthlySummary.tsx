import { formatCurrency } from "@/lib/utils";
import { TrendingDown, TrendingUp, AlertCircle } from "lucide-react";

interface Props {
  expense: number;
  income: number;
  unclassified: number;
}

export function MonthlySummary({ expense, income, unclassified }: Props) {
  const now = new Date();
  const label = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  return (
    <div className="grid grid-cols-3 gap-4 mb-5">
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown className="w-4 h-4 text-red-500" />
          <p className="text-xs text-gray-500">{label} 支出</p>
        </div>
        <p className="text-xl font-bold text-red-600 tabular-nums">{formatCurrency(expense)}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <p className="text-xs text-gray-500">{label} 収入</p>
        </div>
        <p className="text-xl font-bold text-green-600 tabular-nums">{formatCurrency(income)}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4 text-yellow-500" />
          <p className="text-xs text-gray-500">未分類</p>
        </div>
        <p className="text-xl font-bold text-yellow-600 tabular-nums">{unclassified}件</p>
      </div>
    </div>
  );
}
