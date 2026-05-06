import type { ScannedItem } from "@/types";

export function parsePdfText(text: string): ScannedItem[] {
  const items: ScannedItem[] = [];

  const pad = (n: number) => String(n).padStart(2, "0");
  const parseAmt = (s: string) => parseInt(s.replace(/,/g, ""), 10);
  const hasJp = (s: string) => /[　-鿿゠-ヿ＀-￯]/.test(s);

  const flat = text.replace(/\r?\n/g, " ");

  // ヘッダーから年を取得
  let baseYear = new Date().getFullYear();
  const yearMatch = flat.match(/(\d{4})年/);
  if (yearMatch) baseYear = parseInt(yearMatch[1]);

  // 日付マーカーを複数フォーマットで収集
  const dateMarkers: { index: number; date: string }[] = [];

  // 1. YYYY年MM月DD日
  const fullJpRe = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
  let fd: RegExpExecArray | null;
  while ((fd = fullJpRe.exec(flat)) !== null) {
    dateMarkers.push({
      index: fd.index,
      date: `${fd[1]}-${fd[2].padStart(2, "0")}-${fd[3].padStart(2, "0")}`,
    });
  }

  // 2. MM月DD日（YYYY年MM月DD日 と重複する位置はスキップ）
  const shortJpRe = /(\d{1,2})月(\d{1,2})日/g;
  while ((fd = shortJpRe.exec(flat)) !== null) {
    const overlap = dateMarkers.some(
      (m) => fd!.index >= m.index && fd!.index <= m.index + 14
    );
    if (!overlap) {
      dateMarkers.push({
        index: fd.index,
        date: `${baseYear}-${fd[1].padStart(2, "0")}-${fd[2].padStart(2, "0")}`,
      });
    }
  }

  // 3. YYYY/MM/DD
  const slashRe = /(\d{4})\/(\d{2})\/(\d{2})/g;
  while ((fd = slashRe.exec(flat)) !== null) {
    dateMarkers.push({ index: fd.index, date: `${fd[1]}-${fd[2]}-${fd[3]}` });
  }

  dateMarkers.sort((a, b) => a.index - b.index);

  function getDateAt(pos: number): string {
    if (dateMarkers.length === 0) return `${baseYear}-01-01`;
    let best = dateMarkers[0].date;
    for (const m of dateMarkers) {
      if (m.index <= pos) best = m.date;
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
    items.push({ date: getDateAt(m.index), description: desc, amount: debit, type: "EXPENSE" });
  }

  // 収入パターン: [日本語テキスト] 0 [入金額] [残高]
  const incRe = /([^\d]{2,}?)\s+0\s+([\d,]{2,12})\s+([\d,]{2,12})/g;
  while ((m = incRe.exec(flat)) !== null) {
    const desc = m[1].trim().replace(/\s+/g, " ");
    const credit = parseAmt(m[2]);
    if (credit <= 0 || !hasJp(desc)) continue;
    items.push({ date: getDateAt(m.index), description: desc, amount: credit, type: "INCOME" });
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
