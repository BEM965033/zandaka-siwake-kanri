import { getTransactions } from "@/actions/transactions";
import { getAccounts } from "@/actions/accounts";
import { getCategories } from "@/actions/categories";
import { TransactionList } from "@/components/transactions/TransactionList";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const [transactions, accounts, categories] = await Promise.all([
    getTransactions({
      type: params.type,
      accountId: params.accountId,
      categoryId: params.categoryId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }),
    getAccounts(),
    getCategories(),
  ]);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-lg font-semibold text-gray-900 mb-5">履歴一覧</h1>
      <TransactionList
        transactions={transactions.map((t) => ({
          id: t.id,
          date: t.date,
          type: t.type,
          amount: t.amount.toString(),
          description: t.description,
          memo: t.memo,
          isClassified: t.isClassified,
          fromAccount: t.fromAccount
            ? { id: t.fromAccount.id, name: t.fromAccount.name, type: t.fromAccount.type }
            : null,
          toAccount: t.toAccount
            ? { id: t.toAccount.id, name: t.toAccount.name, type: t.toAccount.type }
            : null,
          category: t.category ? { id: t.category.id, name: t.category.name } : null,
        }))}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name, type: a.type }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
        currentFilters={params}
      />
    </div>
  );
}
