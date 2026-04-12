import { getAccounts } from "@/actions/accounts";
import { getCategories } from "@/actions/categories";
import { TransactionTabs } from "@/components/transactions/TransactionTabs";
import type { AccountWithBalance, CategoryOption } from "@/types";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage() {
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

  const expenseCategories: CategoryOption[] = expenseCats.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    debitAccount: c.debitAccount,
    creditAccount: c.creditAccount,
  }));

  const incomeCategories: CategoryOption[] = incomeCats.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    debitAccount: c.debitAccount,
    creditAccount: c.creditAccount,
  }));

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-lg font-semibold text-gray-900 mb-5">取引入力</h1>
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <TransactionTabs
          accounts={accountsForClient}
          expenseCategories={expenseCategories}
          incomeCategories={incomeCategories}
        />
      </div>
    </div>
  );
}
