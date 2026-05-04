import type { ScannedItem } from "@/types";

function parseAmount(raw: string): number {
  const n = parseInt(raw.replace(/[¥￥,\s円+]/g, ""), 10);
  return isNaN(n) ? 0 : Math.abs(n);
}

function parseDate(raw: string): string | null {
  const s = raw.trim();
  let m: RegExpMatchArray | null;

  m = s.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;

  m = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日?/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;

  m = s.match(/令和(\d+)年(\d{1,2})月(\d{1,2})日?/);
  if (m) return `${2018 + parseInt(m[1])}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;

  m = s.match(/平成(\d+)年(\d{1,2})月(\d{1,2})日?/);
  if (m) return `${1988 + parseInt(m[1])}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;

  const year = new Date().getFullYear();
  m = s.match(/(\d{1,2})[\/\.](\d{1,2})/);
  if (m) return `${year}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;

  return null;
}

export function parsePdfText(text: string): ScannedItem[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: ScannedItem[] = [];

  for (const line of lines) {
    // 行頭が日付パターンで始まる行を対象にする
    const dateMatch = line.match(/^(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}|\d{1,2}[\/\.]\d{1,2}|\d{4}年\d{1,2}月\d{1,2}日?|令和\d+年\d{1,2}月\d{1,2}日?)/);
    if (!dateMatch) continue;

    const date = parseDate(dateMatch[1]);
    if (!date) continue;

    // 行内の金額を全部抽出
    const amountMatches = [...line.matchAll(/[¥￥]?(\d{1,3}(?:,\d{3})+|\d{4,})/g)];
    const amounts = amountMatches.map((m) => parseAmount(m[0])).filter((n) => n >= 10);
    if (amounts.length === 0) continue;

    // 出金・入金の両方が存在するか判定（列が2つある場合）
    const debitMatch  = line.match(/出金[^\d]*([¥￥]?[\d,]+)/);
    const creditMatch = line.match(/入金[^\d]*([¥￥]?[\d,]+)/);

    if (debitMatch) {
      const desc = extractDesc(line, dateMatch[1]);
      const amount = parseAmount(debitMatch[1]);
      if (amount > 0 && desc) items.push({ date, description: desc, amount, type: "EXPENSE" });
      continue;
    }
    if (creditMatch) {
      const desc = extractDesc(line, dateMatch[1]);
      const amount = parseAmount(creditMatch[1]);
      if (amount > 0 && desc) items.push({ date, description: desc, amount, type: "INCOME" });
      continue;
    }

    // 列ラベルがない場合: 最後の金額=残高、その前=取引金額とみなす
    const txAmount = amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[amounts.length - 1];
    if (txAmount <= 0) continue;

    const desc = extractDesc(line, dateMatch[1]);
    if (!desc) continue;

    items.push({ date, description: desc, amount: txAmount, type: "EXPENSE" });
  }

  return items;
}

function extractDesc(line: string, dateRaw: string): string {
  return line
    .replace(dateRaw, "")
    .replace(/[¥￥]?\s*\d{1,3}(?:,\d{3})+/g, "")
    .replace(/[¥￥]?\s*\d{4,}/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
  const result = await pdfParse(Buffer.from(buffer));
  return result.text;
}
