# 資金管理＋簡易仕訳補助 Webアプリ 実装プラン

## Context

個人事業・小規模法人向けに、複数口座（手元現金・地方銀行・ネット銀行）の残高をリアルタイムで把握し、
収支・振替入力から自動仕訳を生成するWebアプリを新規構築する。
リポジトリは現在空の状態。Next.js App Router + Prisma + PostgreSQL + shadcn/ui で一から作成する。

---

## 1. ディレクトリ構成

```
zandaka_siwake_kanri/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # ルートレイアウト（サイドナビ含む）
│   │   ├── globals.css
│   │   ├── page.tsx                   # ダッシュボード (/)
│   │   ├── transactions/
│   │   │   ├── new/page.tsx           # 取引入力
│   │   │   └── page.tsx               # 履歴一覧
│   │   ├── accounts/
│   │   │   └── page.tsx               # 口座設定
│   │   └── categories/
│   │       └── page.tsx               # カテゴリ設定
│   ├── components/
│   │   ├── ui/                        # shadcn/ui生成コンポーネント
│   │   ├── layout/
│   │   │   ├── AppShell.tsx           # サイドナビ＋メインエリアのラッパー
│   │   │   └── Sidebar.tsx
│   │   ├── dashboard/
│   │   │   ├── TotalBalanceHeader.tsx # 総残高大表示
│   │   │   ├── AccountCard.tsx        # 口座別残高カード
│   │   │   ├── MonthlySummary.tsx     # 今月支出・収入・未分類件数
│   │   │   └── RecentTransactions.tsx # 最近の取引一覧
│   │   ├── transactions/
│   │   │   ├── TransactionTabs.tsx    # 支出/収入/振替タブ
│   │   │   ├── ExpenseForm.tsx
│   │   │   ├── IncomeForm.tsx
│   │   │   └── TransferForm.tsx
│   │   ├── accounts/
│   │   │   ├── AccountList.tsx
│   │   │   └── AccountForm.tsx
│   │   └── categories/
│   │       ├── CategoryList.tsx
│   │       └── CategoryForm.tsx
│   ├── actions/                       # Server Actions
│   │   ├── accounts.ts
│   │   ├── categories.ts
│   │   ├── transactions.ts            # 残高更新＋仕訳生成を含む
│   │   └── dashboard.ts
│   ├── lib/
│   │   ├── prisma.ts                  # Prismaクライアントシングルトン
│   │   ├── balance.ts                 # 残高計算・振替処理ロジック
│   │   ├── journal.ts                 # 仕訳自動生成ロジック
│   │   └── utils.ts                   # 金額フォーマット等のユーティリティ
│   └── types/
│       └── index.ts                   # 共通型定義
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                        # 初期データ（口座・カテゴリサンプル）
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## 2. Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum AccountType {
  CASH        // 手元現金
  LOCAL_BANK  // 地方銀行
  NET_BANK    // ネット銀行
  OTHER
}

enum TransactionType {
  EXPENSE   // 支出
  INCOME    // 収入
  TRANSFER  // 振替
}

enum CategoryType {
  EXPENSE
  INCOME
}

model Account {
  id             String      @id @default(cuid())
  name           String
  type           AccountType
  balance        Decimal     @default(0) @db.Decimal(15, 0)
  initialBalance Decimal     @default(0) @db.Decimal(15, 0)
  sortOrder      Int         @default(0)
  isActive       Boolean     @default(true)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  transactionsFrom Transaction[] @relation("FromAccount")
  transactionsTo   Transaction[] @relation("ToAccount")
}

model Category {
  id            String       @id @default(cuid())
  name          String
  type          CategoryType
  debitAccount  String?      // 借方勘定科目名（例: 消耗品費）
  creditAccount String?      // 貸方勘定科目名（例: 現金）
  isActive      Boolean      @default(true)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  transactions Transaction[]
}

model Transaction {
  id            String          @id @default(cuid())
  date          DateTime
  type          TransactionType
  amount        Decimal         @db.Decimal(15, 0)
  description   String
  memo          String?
  isClassified  Boolean         @default(false) // 未分類フラグ

  fromAccountId String?
  toAccountId   String?
  categoryId    String?

  fromAccount Account?  @relation("FromAccount", fields: [fromAccountId], references: [id])
  toAccount   Account?  @relation("ToAccount",   fields: [toAccountId],   references: [id])
  category    Category? @relation(fields: [categoryId], references: [id])

  journalEntries JournalEntry[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model JournalEntry {
  id            String   @id @default(cuid())
  transactionId String
  lineNo        Int      // 借方=1, 貸方=2
  accountName   String   // 勘定科目名
  debit         Decimal  @default(0) @db.Decimal(15, 0)
  credit        Decimal  @default(0) @db.Decimal(15, 0)
  description   String

  transaction Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
}
```

---

## 3. 初期画面一覧

| パス | 画面名 | 主な機能 |
|------|--------|----------|
| `/` | ダッシュボード | 総残高・口座カード・今月統計・最近取引 |
| `/transactions/new` | 取引入力 | 支出/収入/振替タブフォーム |
| `/transactions` | 履歴一覧 | 検索・絞り込み・編集・削除 |
| `/accounts` | 口座設定 | 口座一覧・追加・編集 |
| `/categories` | カテゴリ設定 | カテゴリ一覧・追加・編集 |

---

## 4. MVP Server Actions

### `src/actions/dashboard.ts`
- `getDashboardData()` — 総残高・口座別残高・今月支出/収入・未分類件数・最近10件を一括取得

### `src/actions/accounts.ts`
- `getAccounts()` — 全口座取得
- `createAccount(data)` — 口座作成
- `updateAccount(id, data)` — 口座更新

### `src/actions/categories.ts`
- `getCategories(type?)` — カテゴリ取得（type絞り込み可）
- `createCategory(data)` — カテゴリ作成
- `updateCategory(id, data)` — カテゴリ更新

### `src/actions/transactions.ts`
- `createTransaction(data)` — トランザクション内で以下を一括実行:
  1. Transactionレコード作成
  2. 口座残高更新（fromAccount.balance -= amount, toAccount.balance += amount）
  3. JournalEntryレコード自動生成（`lib/journal.ts`のロジックを使用）
- `getTransactions(filters)` — 日付・口座・カテゴリ・種別で絞り込み取得
- `updateTransaction(id, data)` — 残高差分修正＋再仕訳
- `deleteTransaction(id)` — 残高ロールバック＋Cascade削除

---

## 5. 主要ロジック

### `src/lib/balance.ts`
```typescript
// 振替処理: Prisma.$transaction内で呼び出す
export async function applyTransfer(
  prisma: PrismaClient,
  fromAccountId: string,
  toAccountId: string,
  amount: Decimal
) {
  await prisma.account.update({
    where: { id: fromAccountId },
    data: { balance: { decrement: amount } },
  });
  await prisma.account.update({
    where: { id: toAccountId },
    data: { balance: { increment: amount } },
  });
}
```

### `src/lib/journal.ts`
```typescript
// 仕訳自動生成
// 支出: 借方=カテゴリのdebitAccount, 貸方=支払口座の勘定科目名
// 収入: 借方=入金口座の勘定科目名, 貸方=カテゴリのcreditAccount
// 振替（例: 地方銀行→現金）: 借方=現金, 貸方=普通預金
export function buildJournalEntries(transaction, fromAccount?, toAccount?, category?): JournalEntryInput[]
```

---

## 6. ダッシュボード実装詳細

### `src/app/page.tsx`（Server Component）
```tsx
// getDashboardData()をawaitして各コンポーネントにpropsで渡す
const data = await getDashboardData();
return (
  <main>
    <TotalBalanceHeader total={data.totalBalance} />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {data.accounts.map(a => <AccountCard key={a.id} account={a} />)}
    </div>
    <MonthlySummary expense={data.monthlyExpense} income={data.monthlyIncome} unclassified={data.unclassifiedCount} />
    <RecentTransactions transactions={data.recentTransactions} />
  </main>
);
```

### `TotalBalanceHeader` — 総残高を`text-4xl font-bold`で中央表示、カラー: 正=green, 負=red

### `AccountCard` — アイコン（口座種別）＋口座名＋残高。shadcn `<Card>`使用

### `MonthlySummary` — 今月支出（赤）・収入（緑）・未分類件数（黄）を横並びで表示

### `RecentTransactions` — shadcn `<Table>`で日付・種別・内容・口座・金額を表示

---

## 7. セットアップ手順

**DB: Supabase（ホスティング済みPostgreSQL）**

1. `npx create-next-app@latest . --typescript --tailwind --app --src-dir`
2. `npm install prisma @prisma/client`
3. `npx prisma init`
4. Supabaseプロジェクト作成 → Settings > Database > Connection String（URI）を`.env`の`DATABASE_URL`に設定
   - `DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true"`
   - `DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"`  ← マイグレーション用
   - `prisma/schema.prisma`のdatasourceに`directUrl = env("DIRECT_URL")`も追加
5. `npx shadcn@latest init`
6. 必要なshadcnコンポーネントを追加: `card table tabs form select input textarea badge`
7. `prisma/schema.prisma`を作成・`npx prisma migrate dev --name init`
8. `npx prisma db seed`でサンプルデータ投入

---

## 8. 検証方法

- `npm run dev`でローカル起動
- ダッシュボードで口座残高・総残高が表示されることを確認
- `/transactions/new`で支出・収入・振替を入力し、残高が即座に反映されることを確認
- 振替入力後、仕訳エントリ（借方/貸方）がDBに正しく生成されることを`prisma studio`で確認
- `/transactions`で絞り込み検索が動作することを確認

---

## 9. AI提案機能（将来拡張）

`src/lib/ai.ts`に分離し、`createTransaction`のServer Actionから任意で呼び出せる構造にする。
入力内容（description, amount）→ Claude API → カテゴリ提案・仕訳候補を返す。
現在はスタブ関数のみ用意しておく。
