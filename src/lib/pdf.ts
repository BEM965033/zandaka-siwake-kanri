import type { ScannedItem } from "@/types";

export function parsePdfText(text: string): ScannedItem[] {
  const items: ScannedItem[] = [];

  const pad = (n: number) => String(n).padStart(2, "0");
  const parseAmt = (s: string) => parseInt(s.replace(/,/g, ""), 10);
  const hasJp = (s: string) => /[　-鿿゠-ヿ＀-￯]/.test(s);

  const flat = text.replace(/\r?\n/g, " ");

  // 完全な日付文字列を探す
  const fullDateRe = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
  const fullDates: { start: number; end: number; date: string }[] = [];
  let fd: RegExpExecArray | null;
  while ((fd = fullDateRe.exec(flat)) !== null) {
    const y = fd[1], mo = fd[2].padStart(2, "0"), d = fd[3].padStart(2, "0");
    fullDates.push({ start: fd.index, end: fd.index + fd[0].length, date: `${y}-${mo}-${d}` });
  }

  function parseSegment(segment: string, date: string) {
    const expRe = /([^\d]{2,}?)\s+([\d,]{2,12})\s+0\s+([\d,]{2,12})/g;
    let m: RegExpExecArray | null;
    while ((m = expRe.exec(segment)) !== null) {
      const desc = m[1].trim().replace(/\s+/g, " ");
      const debit = parseAmt(m[2]);
      if (debit <= 0 || !hasJp(desc)) continue;
      items.push({ date, description: desc, amount: debit, type: "EXPENSE" });
    }
    const incRe = /([^\d]{2,}?)\s+0\s+([\d,]{2,12})\s+([\d,]{2,12})/g;
    while ((m = incRe.exec(segment)) !== null) {
      const desc = m[1].trim().replace(/\s+/g, " ");
      const credit = parseAmt(m[2]);
      if (credit <= 0 || !hasJp(desc)) continue;
      items.push({ date, description: desc, amount: credit, type: "INCOME" });
    }
  }

  if (fullDates.length > 0) {
    // 日付ごとにセグメントを切り出して解析
    for (let i = 0; i < fullDates.length; i++) {
      const segStart = fullDates[i].end;
      const segEnd = i + 1 < fullDates.length ? fullDates[i + 1].start : flat.length;
      parseSegment(flat.slice(segStart, segEnd), fullDates[i].date);
    }
  } else {
    // フォールバック: ヘッダーから年月を取得して日マーカーで推定
    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;
    const ymNum = flat.match(/(\d{4})\s+(\d{1,2})\s+1/);
    if (ymNum) { year = parseInt(ymNum[1]); month = parseInt(ymNum[2]); }
    const ymJp = flat.match(/(\d{4})年(\d{1,2})月/);
    if (ymJp) { year = parseInt(ymJp[1]); month = parseInt(ymJp[2]); }

    const dayMarkers: { index: number; day: number }[] = [];
    const dayRe = /(?<![,\d])([12]?\d|3[01])(?!\d|,)(?=\s+[^\d])/g;
    let dm: RegExpExecArray | null;
    while ((dm = dayRe.exec(flat)) !== null) {
      const d = parseInt(dm[1]);
      if (d >= 1 && d <= 31) dayMarkers.push({ index: dm.index, day: d });
    }

    const expRe = /([^\d]{2,}?)\s+([\d,]{2,12})\s+0\s+([\d,]{2,12})/g;
    let m: RegExpExecArray | null;
    while ((m = expRe.exec(flat)) !== null) {
      const desc = m[1].trim().replace(/\s+/g, " ");
      const debit = parseAmt(m[2]);
      if (debit <= 0 || !hasJp(desc)) continue;
      let day = 1;
      for (const mk of dayMarkers) { if (mk.index <= m.index) day = mk.day; else break; }
      items.push({ date: `${year}-${pad(month)}-${pad(day)}`, description: desc, amount: debit, type: "EXPENSE" });
    }
    const incRe = /([^\d]{2,}?)\s+0\s+([\d,]{2,12})\s+([\d,]{2,12})/g;
    while ((m = incRe.exec(flat)) !== null) {
      const desc = m[1].trim().replace(/\s+/g, " ");
      const credit = parseAmt(m[2]);
      if (credit <= 0 || !hasJp(desc)) continue;
      let day = 1;
      for (const mk of dayMarkers) { if (mk.index <= m.index) day = mk.day; else break; }
      items.push({ date: `${year}-${pad(month)}-${pad(day)}`, description: desc, amount: credit, type: "INCOME" });
    }
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
