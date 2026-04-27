import { getAccounts } from "@/actions/accounts";
import { getCategories } from "@/actions/categories";
import { ScanPage } from "@/components/scan/ScanPage";
import type { AccountWithBalance, CategoryOption } from "@/types";

export const dynamic = "force-dynamic";

export default async function BankScanPage() {
  const [accounts, expenseCats, incomeCats] = await Promise.all([
    getAccounts(),
    getCategories("EXPENSE"),
    getCategories("INCOME"),
  ]);

  const accountsForClient: AccountWithBalance[] = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    balance: a.balance.toString(),
    isActive: a.isActive,
    sortOrder: a.sortOrder,
  }));

  const allCategories: CategoryOption[] = [...expenseCats, ...incomeCats].map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    debitAccount: c.debitAccount,
    creditAccount: c.creditAccount,
  }));

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-lg font-semibold text-gray-900 mb-5">通帳スキャン</h1>
      <ScanPage accounts={accountsForClient} categories={allCategories} />
    </div>
  );
}
