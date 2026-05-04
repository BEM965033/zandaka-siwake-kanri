import type { ScannedItem } from "@/types";

export function parsePdfText(text: string): ScannedItem[] {
  const items: ScannedItem[] = [];

  // 年月をヘッダーから抽出
  let year = new Date().getFullYear();
  let month = new Date().getMonth() + 1;
  const ymNum = text.match(/(\d{4})\s+(\d{1,2})\s+1/);
  if (ymNum) { year = parseInt(ymNum[1]); month = parseInt(ymNum[2]); }
  const ymJp = text.match(/(\d{4})年(\d{1,2})月/);
  if (ymJp) { year = parseInt(ymJp[1]); month = parseInt(ymJp[2]); }

  const pad = (n: number) => String(n).padStart(2, "0");
  const parseAmt = (s: string) => parseInt(s.replace(/,/g, ""), 10);
  const hasJp = (s: string) => /[　-鿿゠-ヿ＀-￯]/.test(s);

  // テキストを1行に平坦化
  const flat = text.replace(/\r?\n/g, " ");

  // 日付マーカー（1〜31の単独数字）の位置を記録
  const dayMarkers: { index: number; day: number }[] = [];
  const dayRe = /(?<![,\d])([12]?\d|3[01])(?!\d|,)(?=\s+[^\d])/g;
  let dm: RegExpExecArray | null;
  while ((dm = dayRe.exec(flat)) !== null) {
    const d = parseInt(dm[1]);
    if (d >= 1 && d <= 31) dayMarkers.push({ index: dm.index, day: d });
  }

  function getDayAt(pos: number): number {
    let best = 1;
    for (const marker of dayMarkers) {
      if (marker.index <= pos) best = marker.day;
      else break;
    }
    return best;
  }

  // 支出パターン: [日本語テキスト] [出金額] 0 [残高]
  const expRe = /([^\d]{2,}?)\s+([\d,]{2,12})\s+0\s+([\d,]{2,12})/g;
  let m: RegExpExecArray | null;
  while ((m = expRe.exec(flat)) !== null) {
    const desc = m[1].trim().replace(/\s+/g, " ");
    const debit = parseAmt(m[2]);
    if (debit <= 0 || !hasJp(desc)) continue;
    const d = getDayAt(m.index);
    items.push({ date: `${year}-${pad(month)}-${pad(d)}`, description: desc, amount: debit, type: "EXPENSE" });
  }

  // 収入パターン: [日本語テキスト] 0 [入金額] [残高]
  const incRe = /([^\d]{2,}?)\s+0\s+([\d,]{2,12})\s+([\d,]{2,12})/g;
  while ((m = incRe.exec(flat)) !== null) {
    const desc = m[1].trim().replace(/\s+/g, " ");
    const credit = parseAmt(m[2]);
    if (credit <= 0 || !hasJp(desc)) continue;
    const d = getDayAt(m.index);
    items.push({ date: `${year}-${pad(month)}-${pad(d)}`, description: desc, amount: credit, type: "INCOME" });
  }

  // 重複除去
  const seen = new Set<string>();
  return items.filter((it) => {
    const key = `${it.date}|${it.description}|${it.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  // pdf-parseはindex.jsでテストファイルを読もうとするためサーバーレス環境で失敗する
  // lib/pdf-parse.js を直接使うことで回避
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require("pdf-parse/lib/pdf-parse.js");
  const result = await pdfParse(Buffer.from(buffer));
  return result.text;
}
