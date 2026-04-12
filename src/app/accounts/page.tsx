import { getAccounts } from "@/actions/accounts";
import { AccountList } from "@/components/accounts/AccountList";
import { AccountForm } from "@/components/accounts/AccountForm";
import type { AccountWithBalance } from "@/types";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const accounts = await getAccounts();

  const accountsForClient: AccountWithBalance[] = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    balance: a.balance.toString(),
    isActive: a.isActive,
    sortOrder: a.sortOrder,
  }));

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-lg font-semibold text-gray-900 mb-5">口座設定</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AccountList accounts={accountsForClient} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 px-5 py-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">口座を追加</h2>
          <AccountForm />
        </div>
      </div>
    </div>
  );
}
