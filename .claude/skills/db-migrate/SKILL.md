---
name: db-migrate
description: Prisma スキーマ変更を安全にマイグレーションする手順。ローカル .env が本番 Supabase を指しているため、migrate dev を使わずSQLを生成して確認してから適用する。スキーマ変更・カラム追加・テーブル追加の時に使う。
argument-hint: "<マイグレーション名（snake_case）>"
---

# 安全なマイグレーション手順

**前提: ローカルの `DATABASE_URL` / `DIRECT_URL` は本番 Supabase（ap-southeast-2）を指している。**
`prisma migrate dev` / `migrate reset` / `db push` は本番データを壊しうるので使わない（フックでもブロック済み）。

1. `prisma/schema.prisma` を編集する。
   - 金額は `Decimal @db.Decimal(15, 0)`、IDは `String @id @default(cuid())` に揃える。
   - 既存データがあるテーブルへの必須カラム追加は `@default` を付けるか nullable にする。
2. `npx prisma format` と `npx prisma validate`。
3. マイグレーションフォルダを作る: `prisma/migrations/<YYYYMMDDHHMMSS>_<name>/migration.sql`
   - タイムスタンプは現在時刻（`date +%Y%m%d%H%M%S`）。name は引数 `$ARGUMENTS`。
4. SQLを生成する:
   ```bash
   npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
   ```
   （オプション名がエラーになったら `npx prisma migrate diff --help` で確認。Prisma 7 系）
   出力を `migration.sql` に書く。
5. **生成SQLをユーザーに見せて確認を取る。** 特に `DROP` / `ALTER COLUMN ... TYPE` / `NOT NULL` 追加はデータ影響を明記する。
   RLS を有効にしている（`20260423000000_enable_rls`）ので、新テーブルには `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` も追加する。
6. 承認後に `npx prisma migrate deploy`（実行前に確認プロンプトが出る）。
7. `npx prisma generate` → `npx tsc --noEmit` で型を更新・確認。
8. `npx prisma migrate status` で適用済みを確認して報告。

`src/generated/prisma/` は生成物なので手で編集しない。
