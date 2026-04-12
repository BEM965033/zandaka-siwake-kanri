"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ExpenseForm } from "./ExpenseForm";
import { IncomeForm } from "./IncomeForm";
import { TransferForm } from "./TransferForm";
import type { AccountWithBalance, CategoryOption } from "@/types";

interface Props {
  accounts: AccountWithBalance[];
  expenseCategories: CategoryOption[];
  incomeCategories: CategoryOption[];
}

type Tab = "expense" | "income" | "transfer";

const tabs: { id: Tab; label: string; color: string }[] = [
  { id: "expense", label: "支出", color: "border-red-500 text-red-600" },
  { id: "income", label: "収入", color: "border-green-500 text-green-600" },
  { id: "transfer", label: "振替", color: "border-blue-500 text-blue-600" },
];

export function TransactionTabs({ accounts, expenseCategories, incomeCategories }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("expense");

  return (
    <div>
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? tab.color + " -mb-px"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "expense" && (
        <ExpenseForm accounts={accounts} categories={expenseCategories} />
      )}
      {activeTab === "income" && (
        <IncomeForm accounts={accounts} categories={incomeCategories} />
      )}
      {activeTab === "transfer" && <TransferForm accounts={accounts} />}
    </div>
  );
}
