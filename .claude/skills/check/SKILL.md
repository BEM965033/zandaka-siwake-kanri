---
name: check
description: 型チェックと本番ビルドを実行して、デプロイ前に壊れていないか確認する。「チェックして」「ビルド通る？」「デプロイ前確認」で使う。
argument-hint: "[quick]（quick なら型チェックのみ）"
---

# 品質チェック

1. `npx tsc --noEmit` を実行する。エラーがあれば原因を特定して修正し、再実行する。
2. 引数が `quick` でなければ `npm run build` も実行する（`prisma generate && next build`）。
   - `next build` に `--no-lint` は使えない（このNext.jsでは削除済み）。
   - ビルドは本番DBに接続しない。失敗時はログの先頭エラーから原因を追う。
3. `prisma/schema.prisma` に変更があれば `npx prisma validate` と `npx prisma migrate status` で
   未適用マイグレーションがないか確認する（適用はしない。必要なら /db-migrate を案内）。
4. 結果を短くまとめる: 型チェック / ビルド / マイグレーション状態 それぞれ OK か NG か。

引数: $ARGUMENTS
