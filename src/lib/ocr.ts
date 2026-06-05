import type { ScannedItem } from "@/types";

function extractNumbers(line: string): number[] {
  const matches = [...line.matchAll(/([\d,]{3,})/g)];
  return matches
    .map((m) => parseInt(m[1].replace(/,/g, ""), 10))
    .filter((n) => !isNaN(n) && n >= 100);
}

function parseDate(line: string): string | null {
  // Y-M-D 形式（令和年）: "8-4-9" / "8-4-10"
  const m = line.match(/^(\d{1,2})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const ry = parseInt(m[1]);
    const year = ry >= 1 && ry <= 20 ? 2018 + ry : new Date().getFullYear();
    return `${year}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }
  // MM/DD 形式
  const m2 = line.match(/^(\d{1,2})[\/\.](\d{1,2})$/);
  if (m2) {
    const year = new Date().getFullYear();
    return `${year}-${m2[1].padStart(2, "0")}-${m2[2].padStart(2, "0")}`;
  }
  return null;
}

function isLikelyNoise(line: string): boolean {
  return /^\d+[\.\/]\d+[\.\/]/.test(line);
}

function isLikelyAmount(line: string): boolean {
  return /^[¥￥]?\s*[\d,]+\s*$/.test(line);
}

// Section-based: 日付だけの行があるGoogle Lens形式
function parseSectionBased(lines: string[]): ScannedItem[] {
  const items: ScannedItem[] = [];
  type Section = { date: string; lines: string[] };
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const date = parseDate(line);
    if (date) {
      if (current) sections.push(current);
      current = { date, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  for (const { date, lines: sectionLines } of sections) {
    const descLines: string[] = [];
    const amounts: number[] = [];

    for (const line of sectionLines) {
      if (isLikelyNoise(line)) {
        amounts.push(...extractNumbers(line));
        continue;
      }
      if (isLikelyAmount(line)) {
        amounts.push(...extractNumbers(line));
        continue;
      }
      const nums = extractNumbers(line);
      if (nums.length > 0) amounts.push(...nums);
      if (/[ぁ-ん゠-ヿ一-鿿ｦ-ﾟA-Za-z\*]/.test(line)) {
        descLines.push(line);
      }
    }

    if (descLines.length === 0 || amounts.length === 0) continue;
    const amount = amounts[0];
    const description = descLines.join(" ").replace(/\s+/g, " ").trim();
    items.push({ date, description, amount, type: "EXPENSE" });
  }

  return items;
}

const INCOME_KEYWORDS = /振込入金|入金|受取|給与|賞与|売上|報酬|預入/;

// Same-line: 日付＋内容＋金額が同じ行にある通帳スキャン形式
function parseSameLineFmt(lines: string[]): ScannedItem[] {
  const items: ScannedItem[] = [];
  // "D 8-5-13 摘要..." または "8-5-13 摘要..." 形式
  const dateLineRe = /^D?\s*(\d{1,2})-(\d{1,2})-(\d{1,2})\s+(.+)$/;

  for (const line of lines) {
    const m = line.match(dateLineRe);
    if (!m) continue;

    const ry = parseInt(m[1]);
    const year = ry >= 1 && ry <= 30 ? 2018 + ry : new Date().getFullYear();
    const date = `${year}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    const rest = m[4];

    // 差引残高（*で終わる数字、¥付き数字）を除去してから金額抽出
    const noBalance = rest
      .replace(/[¥￥]?[\d,]+[*＊]/g, "")
      .replace(/[¥￥][\d,]+/g, "");
    const amounts = [...noBalance.matchAll(/([\d,]{3,})/g)]
      .map((a) => parseInt(a[1].replace(/,/g, ""), 10))
      .filter((n) => !isNaN(n) && n >= 100);
    if (amounts.length === 0) continue;

    const amount = amounts[0];

    // 摘要：数字・記号を除去したテキスト部分
    const descPart = rest
      .replace(/[¥￥]?[\d,]+[*＊]/g, " ")
      .replace(/[¥￥][\d,]+/g, " ")
      .replace(/[\d,]{3,}/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!descPart || descPart.length < 1) continue;
    if (/^返済回数/.test(descPart)) continue;

    const type = INCOME_KEYWORDS.test(descPart) ? "INCOME" : "EXPENSE";
    items.push({ date, description: descPart, amount, type });
  }

  return items;
}

export function parseOcrText(text: string): ScannedItem[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Google Lens形式（日付行が単独）を優先
  const sectionResult = parseSectionBased(lines);
  if (sectionResult.length > 0) return sectionResult;

  // 通帳スキャン形式（日付＋内容＋金額が同一行）にフォールバック
  return parseSameLineFmt(lines);
}
