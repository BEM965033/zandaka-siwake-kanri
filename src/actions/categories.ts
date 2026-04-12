"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1, "カテゴリ名を入力してください"),
  type: z.enum(["EXPENSE", "INCOME"]),
  debitAccount: z.string().optional().default(""),
  creditAccount: z.string().optional().default(""),
});

export async function getCategories(type?: "EXPENSE" | "INCOME") {
  return prisma.category.findMany({
    where: {
      isActive: true,
      ...(type ? { type } : {}),
    },
    orderBy: { name: "asc" },
  });
}

export async function createCategory(formData: FormData) {
  const raw = {
    name: formData.get("name"),
    type: formData.get("type"),
    debitAccount: formData.get("debitAccount"),
    creditAccount: formData.get("creditAccount"),
  };

  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, type, debitAccount, creditAccount } = parsed.data;

  await prisma.category.create({
    data: {
      name,
      type,
      debitAccount: debitAccount || null,
      creditAccount: creditAccount || null,
    },
  });

  revalidatePath("/categories");
  return { success: true };
}

export async function updateCategory(id: string, formData: FormData) {
  const raw = {
    name: formData.get("name"),
    type: formData.get("type"),
    debitAccount: formData.get("debitAccount"),
    creditAccount: formData.get("creditAccount"),
  };

  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, type, debitAccount, creditAccount } = parsed.data;

  await prisma.category.update({
    where: { id },
    data: {
      name,
      type,
      debitAccount: debitAccount || null,
      creditAccount: creditAccount || null,
    },
  });

  revalidatePath("/categories");
  return { success: true };
}

export async function deleteCategory(id: string) {
  await prisma.category.update({
    where: { id },
    data: { isActive: false },
  });

  revalidatePath("/categories");
  return { success: true };
}
