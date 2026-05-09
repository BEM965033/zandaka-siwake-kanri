"use server";

import { prisma } from "@/lib/prisma";
import { scanBankStatement } from "@/lib/ai";
import { parseBankCSV, decodeCsv } from "@/lib/csv";
import { extractTextFromPdf, parsePdfText } from "@/lib/pdf";
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

  let items: Awaited<ReturnType<typeof scanBankStatement>>;
  try {
    items = await scanBankStatement(base64, file.type as AllowedMimeType);
  } catch (e) {
    console.error("Gemini API error:", e);
    return { error: "AI読み取りに失敗しました。画像を確認して再試行してください。" };
  }

  if (items.length === 0) return { error: "取引データを読み取れませんでした" };

  return { items };
}

export async function parsePdfFile(formData: FormData) {
  const file = formData.get("csv") as File | null;
  if (!file || file.size === 0) return { error: "PDFファイルを選択してください" };
  if (!file.name.toLowerCase().endsWith(".pdf")) return { error: "PDFファイルを選択してください" };

  try {
    const buffer = await file.arrayBuffer();
    const text = await extractTextFromPdf(buffer);
    const items = parsePdfText(text);
    if (items.length === 0) return { error: "取引データを読み取れませんでした。PDFの形式を確認してください。" };
    return { items };
  } catch (e) {
    console.error("PDF parse error:", e);
    return { error: "PDFの解析に失敗しました" };
  }
}

export async function parseCsvFile(formData: FormData) {
  const file = formData.get("csv") as File | null;
  if (!file || file.size === 0) return { error: "CSVファイルを選択してください" };
  if (!file.name.toLowerCase().endsWith(".csv")) return { error: "CSVファイルを選択してください" };

  try {
    const buffer = await file.arrayBuffer();
    const text = decodeCsv(buffer);
    const items = parseBankCSV(text);
    if (items.length === 0) return { error: "取引データを読み取れませんでした。銀行のCSV形式を確認してください。" };
    return { items };
  } catch (e) {
    console.error("CSV parse error:", e);
    return { error: "CSVの解析に失敗しました" };
  }
}

export async function suggestCategories(descriptions: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const desc of descriptions) {
    // 先頭12文字で部分一致、カテゴリ付き取引の直近を返す
    const key = desc.slice(0, 12);
    const match = await prisma.transaction.findFirst({
      where: { categoryId: { not: null }, description: { contains: key } },
      orderBy: { createdAt: "desc" },
      select: { categoryId: true },
    });
    if (match?.categoryId) result[desc] = match.categoryId;
  }
  return result;
}

export async function bulkCreateTransactions(
  items: ScannedItem[],
  accountId: string
) {
  if (!accountId) return { error: "口座を選択してください" };
  if (items.length === 0) return { error: "登録する取引がありません" };

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return { error: "口座が見つかりません" };

  try {
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
          categoryId: item.categoryId || null,
          journalEntries: { create: journalLines },
        },
      }),
      item.type === "EXPENSE"
        ? prisma.account.update({ where: { id: accountId }, data: { balance: { decrement: item.amount } } })
        : prisma.account.update({ where: { id: accountId }, data: { balance: { increment: item.amount } } }),
    ]);
  }

  } catch (e) {
    console.error("bulk create error:", e);
    return { error: "登録中にエラーが発生しました" };
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  return { success: true, count: items.length };
}
