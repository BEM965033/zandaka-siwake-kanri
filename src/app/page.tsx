import { getDashboardData } from "@/actions/dashboard";
import { TotalBalanceHeader } from "@/components/dashboard/TotalBalanceHeader";
import { AccountCard } from "@/components/dashboard/AccountCard";
import { MonthlySummary } from "@/components/dashboard/MonthlySummary";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import Link from "next/link";
import { PlusCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-gray-900">ダッシュボード</h1>
        <Link
          href="/transactions/new"
          className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          取引を入力
        </Link>
      </div>

      <TotalBalanceHeader total={data.totalBalance} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        {data.accounts.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))}
        {data.accounts.length === 0 && (
          <div className="col-span-3 bg-white rounded-xl border border-dashed border-gray-300 px-5 py-8 text-center">
            <p className="text-sm text-gray-400 mb-2">口座が登録されていません</p>
            <Link href="/accounts" className="text-sm text-blue-600 hover:underline">
              口座を登録する
            </Link>
          </div>
        )}
      </div>

      <MonthlySummary
        expense={data.monthlyExpense}
        income={data.monthlyIncome}
        unclassified={data.unclassifiedCount}
      />

      <RecentTransactions transactions={data.recentTransactions} />
    </div>
  );
}
