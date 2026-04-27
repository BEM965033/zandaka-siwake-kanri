export type AccountType = "CASH" | "LOCAL_BANK" | "NET_BANK" | "OTHER";
export type TransactionType = "EXPENSE" | "INCOME" | "TRANSFER";
export type CategoryType = "EXPENSE" | "INCOME";

export interface AccountWithBalance {
  id: string;
  name: string;
  type: AccountType;
  balance: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CategoryOption {
  id: string;
  name: string;
  type: CategoryType;
  debitAccount: string | null;
  creditAccount: string | null;
}

export interface TransactionWithRelations {
  id: string;
  date: Date;
  type: TransactionType;
  amount: string;
  description: string;
  memo: string | null;
  isClassified: boolean;
  fromAccount: { id: string; name: string; type: AccountType } | null;
  toAccount: { id: string; name: string; type: AccountType } | null;
  category: { id: string; name: string } | null;
}

export interface ScannedItem {
  date: string;
  description: string;
  amount: number;
  type: "EXPENSE" | "INCOME";
  categoryId?: string;
}

export interface DashboardData {
  totalBalance: number;
  accounts: AccountWithBalance[];
  monthlyExpense: number;
  monthlyIncome: number;
  unclassifiedCount: number;
  recentTransactions: TransactionWithRelations[];
}
