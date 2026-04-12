import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  // 口座
  await prisma.account.createMany({
    skipDuplicates: true,
    data: [
      { id: "acc_cash", name: "手元現金", type: "CASH", balance: 50000, initialBalance: 50000, sortOrder: 0 },
      { id: "acc_local", name: "○○地方銀行", type: "LOCAL_BANK", balance: 500000, initialBalance: 500000, sortOrder: 1 },
      { id: "acc_net", name: "△△ネット銀行", type: "NET_BANK", balance: 200000, initialBalance: 200000, sortOrder: 2 },
    ],
  });

  // カテゴリ（支出）
  await prisma.category.createMany({
    skipDuplicates: true,
    data: [
      { id: "cat_supplies", name: "消耗品費", type: "EXPENSE", debitAccount: "消耗品費", creditAccount: null },
      { id: "cat_transport", name: "交通費", type: "EXPENSE", debitAccount: "旅費交通費", creditAccount: null },
      { id: "cat_dining", name: "会議費", type: "EXPENSE", debitAccount: "会議費", creditAccount: null },
      { id: "cat_communication", name: "通信費", type: "EXPENSE", debitAccount: "通信費", creditAccount: null },
      { id: "cat_advertising", name: "広告宣伝費", type: "EXPENSE", debitAccount: "広告宣伝費", creditAccount: null },
      { id: "cat_misc_expense", name: "雑費", type: "EXPENSE", debitAccount: "雑費", creditAccount: null },
    ],
  });

  // カテゴリ（収入）
  await prisma.category.createMany({
    skipDuplicates: true,
    data: [
      { id: "cat_sales", name: "売上", type: "INCOME", debitAccount: null, creditAccount: "売上高" },
      { id: "cat_service", name: "サービス収入", type: "INCOME", debitAccount: null, creditAccount: "売上高" },
      { id: "cat_misc_income", name: "雑収入", type: "INCOME", debitAccount: null, creditAccount: "雑収入" },
    ],
  });

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
