// Stop: 未コミットの .ts/.tsx 変更があれば tsc --noEmit（incremental で数秒）を実行し、
// 型エラーがあれば exit 2 で Claude に差し戻して修正させる。

import { execSync } from "node:child_process";

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
const input = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");

// 差し戻し後の再停止ではループさせない
if (input.stop_hook_active) process.exit(0);

const cwd = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();

let changed = "";
try {
  changed = execSync("git status --porcelain --untracked-files=all", { cwd, encoding: "utf8" });
} catch {
  process.exit(0);
}
const tsChanged = changed
  .split("\n")
  .some((l) => /\.(ts|tsx|mts)$/.test(l.trim()) && !l.includes("src/generated/"));
if (!tsChanged) process.exit(0);

try {
  execSync("npx tsc --noEmit --pretty false", { cwd, encoding: "utf8", stdio: "pipe", timeout: 120_000 });
  process.exit(0);
} catch (e) {
  const out = `${e.stdout ?? ""}${e.stderr ?? ""}`.trim();
  if (!out) process.exit(0); // タイムアウト等は黙って通す
  const lines = out.split("\n");
  const shown = lines.slice(0, 40).join("\n");
  const more = lines.length > 40 ? `\n…ほか ${lines.length - 40} 行` : "";
  process.stderr.write(`[typecheck] 型エラーが残っている。修正して：\n${shown}${more}\n`);
  process.exit(2);
}
