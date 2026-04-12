import { formatCurrency, getAccountTypeLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { AccountWithBalance } from "@/types";
import { Banknote, Building2, Globe } from "lucide-react";

const typeIcons: Record<string, React.ReactNode> = {
  CASH: <Banknote className="w-5 h-5" />,
  LOCAL_BANK: <Building2 className="w-5 h-5" />,
  NET_BANK: <Globe className="w-5 h-5" />,
  OTHER: <Building2 className="w-5 h-5" />,
};

const typeColors: Record<string, string> = {
  CASH: "bg-green-50 text-green-700",
  LOCAL_BANK: "bg-blue-50 text-blue-700",
  NET_BANK: "bg-purple-50 text-purple-700",
  OTHER: "bg-gray-50 text-gray-700",
};

export function AccountCard({ account }: { account: AccountWithBalance }) {
  const balance = Number(account.balance);
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <span className={cn("p-1.5 rounded-lg", typeColors[account.type])}>
          {typeIcons[account.type]}
        </span>
        <div>
          <p className="text-xs text-gray-500">{getAccountTypeLabel(account.type)}</p>
          <p className="text-sm font-medium text-gray-800">{account.name}</p>
        </div>
      </div>
      <p
        className={cn(
          "text-2xl font-bold tabular-nums",
          balance >= 0 ? "text-gray-900" : "text-red-600"
        )}
      >
        {formatCurrency(balance)}
      </p>
    </div>
  );
}
