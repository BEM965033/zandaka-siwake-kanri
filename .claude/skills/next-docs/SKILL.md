---
name: next-docs
description: このプロジェクトの Next.js 16 は学習データと API・規約が異なる。Next.js の API（App Router、Server Actions、middleware/proxy、キャッシュ、revalidate、next.config、画像、フォント等）を使う・変更する前に、同梱ドキュメント node_modules/next/dist/docs を調べる。
argument-hint: "<調べたいトピック>"
---

# Next.js 同梱ドキュメントの参照

インストール済み Next.js（package.json の `next` のバージョン）のドキュメントは
`node_modules/next/dist/docs/` にある。記憶ではなくこれを正とする。

1. トピック `$ARGUMENTS` に関係するファイルを探す:
   - 目次: `node_modules/next/dist/docs/index.md`
   - App Router: `node_modules/next/dist/docs/01-app/`
   - アーキテクチャ: `node_modules/next/dist/docs/03-architecture/`
   - Grep で API 名（例: `revalidatePath`, `cookies`, `middleware`, `proxy`）を検索する。
2. 該当ページを読み、以下を確認する:
   - 関数シグネチャ・同期/非同期（`cookies()`, `headers()`, `params` が Promise か等）
   - 非推奨（deprecated）表記と代替 API
   - ファイル規約（ファイル名・配置場所の変更）
3. 調べた結果を短く要約し、既存コード（`src/app`, `src/actions`, `proxy.ts`）との差分や修正が必要な箇所を挙げる。
4. 学習データ由来の知識と食い違う場合は、ドキュメント側を採用したことを明記する。
