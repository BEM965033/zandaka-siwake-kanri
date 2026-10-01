---
name: commit
description: 現在の変更を確認し、このリポジトリの規約（Conventional Commits + 日本語の要約）でコミットする。「コミットして」「commitして」と言われた時に使う。
argument-hint: "[補足メモ（任意）]"
disable-model-invocation: true
---

# コミット手順

1. `git status` と `git diff`（ステージ済みは `git diff --cached`）で変更内容を把握する。
2. コミットしてはいけないものが混ざっていないか確認する。
   - `.env*`、`.vercel/`、`src/generated/prisma/`、`*.tsbuildinfo`、検証用の一時スクリプト
   - 混ざっていたらステージせず、ユーザーに伝える。
3. `.ts/.tsx` を変更していれば `npx tsc --noEmit` を実行し、エラーがあれば先に直す（コミットしない）。
4. 論理的に別の変更が混ざっていれば、分割コミットを提案する。
5. メッセージ形式（過去ログに合わせる）:
   ```
   <type>: <日本語の要約（何をしたか・なぜ）>

   <必要なら本文。箇条書きで変更点や理由>

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```
   - type: `feat` / `fix` / `refactor` / `chore` / `docs` / `style` / `perf` / `test`
   - 要約は50文字程度。括弧で補足するスタイルもOK（例: `fix: PDF取込の重複除去ロジックを修正（同一内容の別取引が消える不具合）`）
   - 最新の system-reminder で指定された Co-Authored-By 行があればそちらを優先する。
6. ファイルは名前を指定して `git add <path>` する（`git add -A` は使わない）。
7. push はユーザーに明示的に頼まれた時だけ。

補足メモ: $ARGUMENTS
