import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function TotalBalanceHeader({ total }: { total: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 mb-5">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">総残高</p>
      <p
        className={cn(
          "text-4xl font-bold tabular-nums",
          total >= 0 ? "text-gray-900" : "text-red-600"
        )}
      >
        {formatCurrency(total)}
      </p>
    </div>
  );
}
