"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const accountSchema = z.object({
  name: z.string().min(1, "口座名を入力してください"),
  type: z.enum(["CASH", "LOCAL_BANK", "NET_BANK", "OTHER"]),
  initialBalance: z.coerce.number().int().min(0, "0以上の金額を入力してください"),
  sortOrder: z.coerce.number().int().optional().default(0),
});

export async function getAccounts() {
  return prisma.account.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function createAccount(formData: FormData) {
  const raw = {
    name: formData.get("name"),
    type: formData.get("type"),
    initialBalance: formData.get("initialBalance"),
    sortOrder: formData.get("sortOrder"),
  };

  const parsed = accountSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, type, initialBalance, sortOrder } = parsed.data;

  await prisma.account.create({
    data: {
      name,
      type,
      initialBalance,
      balance: initialBalance,
      sortOrder,
    },
  });

  revalidatePath("/");
  revalidatePath("/accounts");
  return { success: true };
}

export async function updateAccount(id: string, formData: FormData) {
  const raw = {
    name: formData.get("name"),
    type: formData.get("type"),
    initialBalance: formData.get("initialBalance"),
    sortOrder: formData.get("sortOrder"),
  };

  const parsed = accountSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, type, sortOrder } = parsed.data;

  await prisma.account.update({
    where: { id },
    data: { name, type, sortOrder },
  });

  revalidatePath("/");
  revalidatePath("/accounts");
  return { success: true };
}

// 初期残高を変更する。現在残高も差額分だけ増減させ、取引による増減はそのまま保つ
export async function updateInitialBalance(id: string, value: unknown) {
  const parsed = z.coerce.number().int().min(0, "0以上の金額を入力してください").safeParse(value);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const newInitial = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({
        where: { id },
        select: { initialBalance: true },
      });
      if (!account) throw new Error("NOT_FOUND");
      const diff = newInitial - Number(account.initialBalance);
      await tx.account.update({
        where: { id },
        data: { initialBalance: newInitial, balance: { increment: diff } },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return { error: "口座が見つかりません" };
    console.error("update initial balance error:", e);
    return { error: "初期残高の更新に失敗しました" };
  }

  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/cash-book");
  return { success: true };
}

export async function deleteAccount(id: string) {
  await prisma.account.update({
    where: { id },
    data: { isActive: false },
  });

  revalidatePath("/");
  revalidatePath("/accounts");
  return { success: true };
}
