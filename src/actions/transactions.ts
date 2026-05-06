"use server";

import { prisma } from "@/lib/prisma";
import { buildJournalEntries } from "@/lib/journal";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const expenseSchema = z.object({
  date: z.string().min(1, "日付を入力してください"),
  fromAccountId: z.string().min(1, "支払口座を選択してください"),
  amount: z.coerce.number().int().positive("金額は1以上を入力してください"),
  categoryId: z.string().optional(),
  description: z.string().min(1, "内容を入力してください"),
  memo: z.string().optional(),
});

const incomeSchema = z.object({
  date: z.string().min(1, "日付を入力してください"),
  toAccountId: z.string().min(1, "入金口座を選択してください"),
  amount: z.coerce.number().int().positive("金額は1以上を入力してください"),
  categoryId: z.string().optional(),
  description: z.string().min(1, "内容を入力してください"),
  memo: z.string().optional(),
});

const transferSchema = z.object({
  date: z.string().min(1, "日付を入力してください"),
  fromAccountId: z.string().min(1, "出金元口座を選択してください"),
  toAccountId: z.string().min(1, "入金先口座を選択してください"),
  amount: z.coerce.number().int().positive("金額は1以上を入力してください"),
  description: z.string().optional().default("振替"),
  memo: z.string().optional(),
}).refine((d) => d.fromAccountId !== d.toAccountId, {
  message: "出金元と入金先は異なる口座を選択してください",
});

export async function createExpense(formData: FormData) {
  const raw = {
    date: formData.get("date"),
    fromAccountId: formData.get("fromAccountId"),
    amount: formData.get("amount"),
    categoryId: formData.get("categoryId") || undefined,
    description: formData.get("description"),
    memo: formData.get("memo") || undefined,
  };

  const parsed = expenseSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { date, fromAccountId, amount, categoryId, description, memo } = parsed.data;

  const [fromAccount, category] = await Promise.all([
    prisma.account.findUnique({ where: { id: fromAccountId } }),
    categoryId ? prisma.category.findUnique({ where: { id: categoryId } }) : null,
  ]);

  if (!fromAccount) return { error: "口座が見つかりません" };

  const journalLines = buildJournalEntries({
    type: "EXPENSE",
    amount,
    description,
    fromAccountType: fromAccount.type,
    categoryDebitAccount: category?.debitAccount,
    categoryCreditAccount: category?.creditAccount,
  });

  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        date: new Date(date),
        type: "EXPENSE",
        amount,
        description,
        memo: memo || null,
        isClassified: !!categoryId,
        fromAccountId,
        categoryId: categoryId || null,
        journalEntries: { create: journalLines },
      },
    }),
    prisma.account.update({
      where: { id: fromAccountId },
      data: { balance: { decrement: amount } },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/transactions");
  return { success: true };
}

export async function createIncome(formData: FormData) {
  const raw = {
    date: formData.get("date"),
    toAccountId: formData.get("toAccountId"),
    amount: formData.get("amount"),
    categoryId: formData.get("categoryId") || undefined,
    description: formData.get("description"),
    memo: formData.get("memo") || undefined,
  };

  const parsed = incomeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { date, toAccountId, amount, categoryId, description, memo } = parsed.data;

  const [toAccount, category] = await Promise.all([
    prisma.account.findUnique({ where: { id: toAccountId } }),
    categoryId ? prisma.category.findUnique({ where: { id: categoryId } }) : null,
  ]);

  if (!toAccount) return { error: "口座が見つかりません" };

  const journalLines = buildJournalEntries({
    type: "INCOME",
    amount,
    description,
    toAccountType: toAccount.type,
    categoryDebitAccount: category?.debitAccount,
    categoryCreditAccount: category?.creditAccount,
  });

  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        date: new Date(date),
        type: "INCOME",
        amount,
        description,
        memo: memo || null,
        isClassified: !!categoryId,
        toAccountId,
        categoryId: categoryId || null,
        journalEntries: { create: journalLines },
      },
    }),
    prisma.account.update({
      where: { id: toAccountId },
      data: { balance: { increment: amount } },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/transactions");
  return { success: true };
}

export async function createTransfer(formData: FormData) {
  const raw = {
    date: formData.get("date"),
    fromAccountId: formData.get("fromAccountId"),
    toAccountId: formData.get("toAccountId"),
    amount: formData.get("amount"),
    description: formData.get("description") || "振替",
    memo: formData.get("memo") || undefined,
  };

  const parsed = transferSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { date, fromAccountId, toAccountId, amount, description, memo } = parsed.data;

  const [fromAccount, toAccount] = await Promise.all([
    prisma.account.findUnique({ where: { id: fromAccountId } }),
    prisma.account.findUnique({ where: { id: toAccountId } }),
  ]);

  if (!fromAccount || !toAccount) return { error: "口座が見つかりません" };

  const journalLines = buildJournalEntries({
    type: "TRANSFER",
    amount,
    description,
    fromAccountType: fromAccount.type,
    toAccountType: toAccount.type,
  });

  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        date: new Date(date),
        type: "TRANSFER",
        amount,
        description,
        memo: memo || null,
        isClassified: true,
        fromAccountId,
        toAccountId,
        journalEntries: { create: journalLines },
      },
    }),
    prisma.account.update({
      where: { id: fromAccountId },
      data: { balance: { decrement: amount } },
    }),
    prisma.account.update({
      where: { id: toAccountId },
      data: { balance: { increment: amount } },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/transactions");
  return { success: true };
}

export async function getTransactions(filters?: {
  type?: string;
  accountId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const where: Record<string, unknown> = {};

  if (filters?.type && filters.type !== "ALL") {
    where.type = filters.type;
  }
  if (filters?.accountId && filters.accountId !== "ALL") {
    where.OR = [
      { fromAccountId: filters.accountId },
      { toAccountId: filters.accountId },
    ];
  }
  if (filters?.categoryId && filters.categoryId !== "ALL") {
    where.categoryId = filters.categoryId;
  }
  if (filters?.dateFrom || filters?.dateTo) {
    where.date = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo + "T23:59:59") } : {}),
    };
  }

  return prisma.transaction.findMany({
    where,
    include: {
      fromAccount: { select: { id: true, name: true, type: true } },
      toAccount: { select: { id: true, name: true, type: true } },
      category: { select: { id: true, name: true } },
      journalEntries: true,
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 200,
  });
}

export async function deleteTransaction(id: string) {
  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: {
      fromAccount: true,
      toAccount: true,
    },
  });
  if (!tx) return { error: "取引が見つかりません" };

  await prisma.$transaction(async (tx2) => {
    await tx2.transaction.delete({ where: { id } });

    if (tx.fromAccountId) {
      await tx2.account.update({
        where: { id: tx.fromAccountId },
        data: { balance: { increment: Number(tx.amount) } },
      });
    }
    if (tx.toAccountId) {
      await tx2.account.update({
        where: { id: tx.toAccountId },
        data: { balance: { decrement: Number(tx.amount) } },
      });
    }
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  return { success: true };
}

export async function updateTransactionCategory(id: string, categoryId: string | null) {
  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: { fromAccount: true, toAccount: true },
  });
  if (!tx) return { error: "取引が見つかりません" };

  const category = categoryId
    ? await prisma.category.findUnique({ where: { id: categoryId } })
    : null;

  const journalLines = buildJournalEntries({
    type: tx.type,
    amount: Number(tx.amount),
    description: tx.description,
    fromAccountType: tx.fromAccount?.type ?? undefined,
    toAccountType: tx.toAccount?.type ?? undefined,
    categoryDebitAccount: category?.debitAccount ?? undefined,
    categoryCreditAccount: category?.creditAccount ?? undefined,
  });

  await prisma.$transaction([
    prisma.journalEntry.deleteMany({ where: { transactionId: id } }),
    prisma.transaction.update({
      where: { id },
      data: {
        categoryId: categoryId ?? null,
        isClassified: !!categoryId,
        journalEntries: { create: journalLines },
      },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/transactions");
  return { success: true };
}
