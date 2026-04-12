"use server";

import { prisma } from "@/lib/prisma";
import type { DashboardData } from "@/types";

export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [accounts, monthlyExpenseTx, monthlyIncomeTx, unclassifiedCount, recentTransactions] =
    await Promise.all([
      prisma.account.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.transaction.aggregate({
        where: {
          type: "EXPENSE",
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          type: "INCOME",
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.count({
        where: { isClassified: false },
      }),
      prisma.transaction.findMany({
        take: 10,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: {
          fromAccount: { select: { id: true, name: true, type: true } },
          toAccount: { select: { id: true, name: true, type: true } },
          category: { select: { id: true, name: true } },
        },
      }),
    ]);

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const monthlyExpense = Number(monthlyExpenseTx._sum.amount ?? 0);
  const monthlyIncome = Number(monthlyIncomeTx._sum.amount ?? 0);

  return {
    totalBalance,
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: a.balance.toString(),
      isActive: a.isActive,
      sortOrder: a.sortOrder,
    })),
    monthlyExpense,
    monthlyIncome,
    unclassifiedCount,
    recentTransactions: recentTransactions.map((t) => ({
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
    })),
  };
}
