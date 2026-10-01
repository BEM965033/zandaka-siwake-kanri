// PreToolUse (Edit / Write / MultiEdit / NotebookEdit): 触ってはいけないファイルへの書き込みをブロックする。

import { existsSync } from "node:fs";
import path from "node:path";

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
const input = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
const filePath = String(input?.tool_input?.file_path ?? input?.tool_input?.notebook_path ?? "");
if (!filePath) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const rel = path.relative(projectDir, path.resolve(projectDir, filePath)).split(path.sep).join("/");

function block(reason) {
  process.stderr.write(`[protect-files] ブロック: ${rel}\n${reason}\n`);
  process.exit(2);
}

// 秘密情報（本番DB接続文字列・APIキー等）
if (/(^|\/)\.env(\..*)?$/.test(rel)) {
  block(".env 系は本番の秘密情報を含む。変更が必要ならユーザーに手順を伝えて手動で編集してもらって。");
}
// Prisma 生成物
if (rel.startsWith("src/generated/prisma/")) {
  block("Prisma の生成コード。prisma/schema.prisma を編集して `npx prisma generate` で再生成して。");
}
// 適用済みマイグレーションの改変（新規作成は許可）
if (/^prisma\/migrations\/[^/]+\/migration\.sql$/.test(rel) && existsSync(path.resolve(projectDir, rel))) {
  block("既存マイグレーションは本番に適用済みの可能性が高い。変更せず新しいマイグレーションを追加して。");
}
// ロックファイル
if (rel === "package-lock.json") {
  block("package-lock.json は直接編集しないで。npm install を使って。");
}

process.exit(0);
