import type { ScannedItem } from "@/types";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      result.push(current); current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result.map((s) => s.trim().replace(/^["']|["']$/g, ""));
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

  m = s.match(/(\d{2})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (m) return `20${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;

  return null;
}

function parseAmount(raw: string): number {
  const n = parseInt(raw.replace(/[¥,\s円+]/g, ""), 10);
  return isNaN(n) ? 0 : Math.abs(n);
}

function findCol(headers: string[], keywords: string[]): number {
  for (const kw of keywords) {
    const i = headers.findIndex((h) => h.includes(kw));
    if (i >= 0) return i;
  }
  return -1;
}

export function parseBankCSV(text: string): ScannedItem[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());

  let headerIdx = -1;
  let headers: string[] = [];
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const cells = parseCSVLine(lines[i]);
    const joined = cells.join("");
    if (/日付|取引日|年月日|入出金/.test(joined)) {
      headerIdx = i;
      headers = cells;
      break;
    }
  }

  if (headerIdx === -1) return [];

  const dateCol  = findCol(headers, ["日付", "取引日", "年月日", "取引年月日"]);
  const descCol  = findCol(headers, ["摘要", "内容", "取引内容", "取引摘要", "備考", "説明"]);
  const debitCol = findCol(headers, ["出金", "お支払", "引出", "支払", "借方", "出金額"]);
  const creditCol = findCol(headers, ["入金", "お預", "預入", "貸方", "入金額"]);

  const items: ScannedItem[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    if (cells.length < 2) continue;

    const dateRaw = dateCol >= 0 ? cells[dateCol] : cells[0];
    const desc    = (descCol >= 0 ? cells[descCol] : cells[1]) ?? "";
    const debit   = debitCol  >= 0 ? parseAmount(cells[debitCol]  ?? "") : 0;
    const credit  = creditCol >= 0 ? parseAmount(cells[creditCol] ?? "") : 0;

    const date = parseDate(dateRaw);
    if (!date || desc.trim() === "") continue;

    if (debit > 0) {
      items.push({ date, description: desc.trim(), amount: debit,  type: "EXPENSE" });
    }
    if (credit > 0) {
      items.push({ date, description: desc.trim(), amount: credit, type: "INCOME" });
    }
  }

  return items;
}

export function decodeCsv(buffer: ArrayBuffer): string {
  // Shift-JIS判定：0x80〜0x9F or 0xE0〜0xFCのバイトがあればSJIS
  const bytes = new Uint8Array(buffer);
  let likelySjis = false;
  for (let i = 0; i < bytes.length - 1; i++) {
    const b = bytes[i];
    if ((b >= 0x81 && b <= 0x9f) || (b >= 0xe0 && b <= 0xfc)) {
      likelySjis = true;
      break;
    }
  }
  const encoding = likelySjis ? "shift-jis" : "utf-8";
  return new TextDecoder(encoding).decode(buffer);
}
