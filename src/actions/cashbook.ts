"use server";

import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export interface CashBookRow {
  id: string;
  date: Date;
  description: string;
  memo: string | null;
  // 相手科目（カテゴリ名・振替先口座名など）
  counterpart: string;
  income: string;
  expense: string;
  balance: string;
  hasPhoto: boolean;
}

export interface CashBook {
  account: { id: string; name: string };
  dateFrom: string;
  dateTo: string;
  openingBalance: string;
  closingBalance: string;
  totalIncome: string;
  totalExpense: string;
  rows: CashBookRow[];
}

export async function getCashAccounts() {
  return prisma.account.findMany({
    where: { isActive: true, type: "CASH" },
    select: { id: true, name: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

// 現金出納帳を作る。前期繰越は「現在残高 − 期首以降の増減」で逆算し、ダッシュボードの残高と一致させる
export async function getCashBook(params: {
  accountId: string;
  dateFrom: string;
  dateTo: string;
}): Promise<CashBook | { error: string }> {
  const { accountId, dateFrom, dateTo } = params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    return { error: "期間の形式が不正です" };
  }
  if (dateFrom > dateTo) return { error: "開始日は終了日以前を指定してください" };

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true, name: true, balance: true },
  });
  if (!account) return { error: "口座が見つかりません" };

  const from = new Date(dateFrom);
  const to = new Date(dateTo + "T23:59:59");

  // photoDataは重いので除外し、写真の有無はphotoMimeTypeで判定する
  const txs = await prisma.transaction.findMany({
    where: {
      date: { gte: from },
      OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
    },
    select: {
      id: true,
      date: true,
      type: true,
      amount: true,
      description: true,
      memo: true,
      photoMimeType: true,
      fromAccountId: true,
      toAccountId: true,
      fromAccount: { select: { name: true } },
      toAccount: { select: { name: true } },
      category: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  // 残高更新ロジック（actions/transactions.ts）と同じ条件で入出金を判定する
  const movements = txs.map((t) => {
    const amount = new Decimal(t.amount.toString());
    const isOut = (t.type === "EXPENSE" || t.type === "TRANSFER") && t.fromAccountId === accountId;
    const isIn = (t.type === "INCOME" || t.type === "TRANSFER") && t.toAccountId === accountId;
    return {
      t,
      income: isIn ? amount : new Decimal(0),
      expense: isOut ? amount : new Decimal(0),
    };
  });

  const netSinceFrom = movements.reduce(
    (sum, m) => sum.plus(m.income).minus(m.expense),
    new Decimal(0)
  );
  const openingBalance = new Decimal(account.balance.toString()).minus(netSinceFrom);

  let running = openingBalance;
  let totalIncome = new Decimal(0);
  let totalExpense = new Decimal(0);
  const rows: CashBookRow[] = [];

  for (const { t, income, expense } of movements) {
    if (t.date > to) break;
    if (income.isZero() && expense.isZero()) continue;
    running = running.plus(income).minus(expense);
    totalIncome = totalIncome.plus(income);
    totalExpense = totalExpense.plus(expense);

    const counterpart =
      t.type === "TRANSFER"
        ? expense.isZero()
          ? `${t.fromAccount?.name ?? "?"}から振替`
          : `${t.toAccount?.name ?? "?"}へ振替`
        : t.category?.name ?? "未分類";

    rows.push({
      id: t.id,
      date: t.date,
      description: t.description,
      memo: t.memo,
      counterpart,
      income: income.toString(),
      expense: expense.toString(),
      balance: running.toString(),
      hasPhoto: t.photoMimeType !== null,
    });
  }

  return {
    account: { id: account.id, name: account.name },
    dateFrom,
    dateTo,
    openingBalance: openingBalance.toString(),
    closingBalance: running.toString(),
    totalIncome: totalIncome.toString(),
    totalExpense: totalExpense.toString(),
    rows,
  };
}
