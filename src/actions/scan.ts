"use server";

import { prisma } from "@/lib/prisma";
import { scanBankStatement } from "@/lib/ai";
import { buildJournalEntries } from "@/lib/journal";
import { revalidatePath } from "next/cache";
import type { ScannedItem } from "@/types";

export async function scanImage(formData: FormData) {
  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) return { error: "画像を選択してください" };

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
  type AllowedMimeType = typeof allowedTypes[number];
  if (!allowedTypes.includes(file.type as AllowedMimeType)) {
    return { error: "JPEG・PNG・WebP・GIF のみ対応しています" };
  }

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  const items = await scanBankStatement(base64, file.type as AllowedMimeType);
  if (items.length === 0) return { error: "取引データを読み取れませんでした" };

  return { items };
}

export async function bulkCreateTransactions(
  items: ScannedItem[],
  accountId: string
) {
  if (!accountId) return { error: "口座を選択してください" };
  if (items.length === 0) return { error: "登録する取引がありません" };

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return { error: "口座が見つかりません" };

  for (const item of items) {
    const category = item.categoryId
      ? await prisma.category.findUnique({ where: { id: item.categoryId } })
      : null;

    const journalLines = buildJournalEntries({
      type: item.type,
      amount: item.amount,
      description: item.description,
      fromAccountType: item.type === "EXPENSE" ? account.type : undefined,
      toAccountType: item.type === "INCOME" ? account.type : undefined,
      categoryDebitAccount: category?.debitAccount ?? undefined,
      categoryCreditAccount: category?.creditAccount ?? undefined,
    });

    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          date: new Date(item.date),
          type: item.type,
          amount: item.amount,
          description: item.description,
          isClassified: !!item.categoryId,
          fromAccountId: item.type === "EXPENSE" ? accountId : null,
          toAccountId: item.type === "INCOME" ? accountId : null,
          categoryId: item.categoryId ?? null,
          journalEntries: { create: journalLines },
        },
      }),
      item.type === "EXPENSE"
        ? prisma.account.update({ where: { id: accountId }, data: { balance: { decrement: item.amount } } })
        : prisma.account.update({ where: { id: accountId }, data: { balance: { increment: item.amount } } }),
    ]);
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  return { success: true, count: items.length };
}
