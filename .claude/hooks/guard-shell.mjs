// PreToolUse (Bash / PowerShell): 取り返しのつかないコマンドをブロックする。
// ローカルの .env は本番 Supabase を指しているため、DB を壊す操作は特に厳しく止める。
// exit 2 + stderr で Claude にブロック理由が返る。

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
const input = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
const cmd = String(input?.tool_input?.command ?? "");

// .env 判定用: ヒアドキュメント本文と git commit -m のメッセージ（文章）は除外して誤検知を防ぐ
const cmdNoProse = cmd
  .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2\s*(\n|$)/g, "\n")
  .replace(/(-m|--message)\s+("[^"]*"|'[^']*')/g, "");

const proseRules = [
  [/(^|[\s"'\/\\=<])\.env(\.[\w.-]+)?(?![\w-])/i, ".env 系は本番の秘密情報を含む。シェルからも読まない・書かない。必要ならユーザーに確認して。"],
  [/\b(printenv|Get-ChildItem\s+env:|gci\s+env:)/i, "環境変数の一覧出力は秘密情報を含む。"],
];
for (const [re, reason] of proseRules) {
  if (re.test(cmdNoProse)) {
    process.stderr.write(`[guard-shell] ブロック: ${reason}\nコマンド: ${cmd}\n`);
    process.exit(2);
  }
}

const rules = [
  [/prisma\s+migrate\s+reset/i, "prisma migrate reset は本番DBを全消去する。ユーザーに手動実行を依頼して。"],
  [/prisma\s+db\s+push[^\n]*(--force-reset|--accept-data-loss)/i, "データ消失を伴う prisma db push は禁止。"],
  [/prisma\s+migrate\s+dev\b/i, "ローカル .env は本番DBを指している。migrate dev は使わず /db-migrate の手順（migrate diff → ユーザー確認 → migrate deploy）に従って。"],
  [/npm\s+run\s+db:migrate/i, "db:migrate は prisma migrate dev。本番DBを指しているので /db-migrate の手順に従って。"],
  [/(npm\s+run\s+db:seed|prisma\s+db\s+seed)/i, "seed は本番DBにデータを投入する。ユーザーに確認して手動で。"],
  [/\b(drop\s+(table|database|schema)|truncate\s+table)\b/i, "DROP / TRUNCATE はブロック。ユーザーに確認して手動で。"],
  [/git\s+push\b[^\n]*(--force\b|-f\b|--force-with-lease)/i, "force push は禁止。"],
  [/git\s+reset\s+--hard/i, "git reset --hard は未コミットの変更を消す。ユーザーに確認して。"],
  [/git\s+clean\s+-[a-z]*f/i, "git clean -f は未追跡ファイルを消す。ユーザーに確認して。"],
  [/vercel\b[^\n]*--prod\b/i, "本番デプロイ（vercel --prod）はユーザーの明示的な指示がある時だけ。ユーザーに実行してもらって。"],
  [/vercel\s+env\s+(rm|remove|add)/i, "Vercel の環境変数変更はユーザーに依頼して。"],
  [/rm\s+-[a-z]*r[a-z]*f?\s+[^\n]*(\/|\\)?(prisma|src|\.git)\b/i, "ソース/DB/リポジトリの再帰削除はブロック。"],
  [/Remove-Item\b[^\n]*-Recurse[^\n]*(prisma|src|\.git)\b/i, "ソース/DB/リポジトリの再帰削除はブロック。"],
];

for (const [re, reason] of rules) {
  if (re.test(cmd)) {
    process.stderr.write(`[guard-shell] ブロック: ${reason}\nコマンド: ${cmd}\n`);
    process.exit(2);
  }
}
process.exit(0);
