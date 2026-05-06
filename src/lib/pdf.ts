import type { ScannedItem } from "@/types";

export function parsePdfText(text: string): ScannedItem[] {
  const parseAmt = (s: string) => parseInt(s.replace(/,/g, ""), 10);
  const hasJp = (s: string) => /[　-鿿゠-ヿ＀-￯]/.test(s);
  const flat = text.replace(/\r?\n/g, " ");

  // 全マッチを位置付きで収集
  type RawMatch = { index: number; description: string; amount: number; type: "EXPENSE" | "INCOME" };
  const allMatches: RawMatch[] = [];

  // 支出パターン: [日本語テキスト] [出金額] 0 [残高]
  const expRe = /([^\d]{2,}?)\s+([\d,]{2,12})\s+0\s+([\d,]{2,12})/g;
  let m: RegExpExecArray | null;
  while ((m = expRe.exec(flat)) !== null) {
    const desc = m[1].trim().replace(/\s+/g, " ");
    const debit = parseAmt(m[2]);
    if (debit <= 0 || !hasJp(desc)) continue;
    allMatches.push({ index: m.index, description: desc, amount: debit, type: "EXPENSE" });
  }

  // 収入パターン: [日本語テキスト] 0 [入金額] [残高]
  const incRe = /([^\d]{2,}?)\s+0\s+([\d,]{2,12})\s+([\d,]{2,12})/g;
  while ((m = incRe.exec(flat)) !== null) {
    const desc = m[1].trim().replace(/\s+/g, " ");
    const credit = parseAmt(m[2]);
    if (credit <= 0 || !hasJp(desc)) continue;
    allMatches.push({ index: m.index, description: desc, amount: credit, type: "INCOME" });
  }

  // 位置順ソート・重複除去（同じdesc+amountが複数マッチした場合）
  allMatches.sort((a, b) => a.index - b.index);
  const seenMatch = new Set<string>();
  const uniqueMatches = allMatches.filter(({ description, amount }) => {
    const key = `${description}|${amount}`;
    if (seenMatch.has(key)) return false;
    seenMatch.add(key);
    return true;
  });

  // 日付を抽出（SBIのPDFではテキスト末尾に取引順で並んでいる）
  const fullDateRe = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
  const dates: string[] = [];
  while ((m = fullDateRe.exec(flat)) !== null) {
    dates.push(`${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`);
  }

  const fallback = dates[0] ?? `${new Date().getFullYear()}-01-01`;

  // i番目の取引 → i番目の日付、で対応付け
  return uniqueMatches.map((item, i) => ({
    date: dates[i] ?? fallback,
    description: item.description,
    amount: item.amount,
    type: item.type,
  }));
}

export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  // pdf-parseはindex.jsでテストファイルを読もうとするためサーバーレス環境で失敗する
  // lib/pdf-parse.js を直接使うことで回避
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require("pdf-parse/lib/pdf-parse.js");
  const result = await pdfParse(Buffer.from(buffer));
  return result.text;
}
