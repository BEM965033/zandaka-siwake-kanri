import type { ScannedItem } from "@/types";

function parseAmount(raw: string): number {
  const n = parseInt(raw.replace(/[¥￥,\s]/g, ""), 10);
  return isNaN(n) ? 0 : Math.abs(n);
}

function parsePassbookDate(line: string): { date: string; rest: string } | null {
  // 令和 Y-MM-DD 形式: "8- 4- 6" / "R8-4-6" / "D 8- 4- 6" など
  // 行のどこかに Y-M-D パターンがあれば採用
  const m = line.match(/(?:^|[^\d])(\d{1,2})-\s*(\d{1,2})-\s*(\d{1,2})(?!\d)/);
  if (m) {
    const ry = parseInt(m[1]);
    const mo = m[2].padStart(2, "0");
    const d  = m[3].padStart(2, "0");
    // Reiwa 元年=2019。1〜20の範囲なら令和年として扱う
    const year = ry >= 1 && ry <= 20 ? 2018 + ry : new Date().getFullYear();
    const date = `${year}-${mo}-${d}`;
    // 日付部分より後ろのテキストを返す
    const endIdx = m.index! + m[0].length;
    return { date, rest: line.slice(endIdx) };
  }
  return null;
}

function parseMonthDayDate(line: string, year: number): { date: string; rest: string } | null {
  // MM/DD or MM.DD 形式
  const m = line.match(/^(\d{1,2})[\/\.]\s*(\d{1,2})/);
  if (m) {
    const date = `${year}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
    return { date, rest: line.slice(m[0].length) };
  }
  return null;
}

export function parseOcrText(text: string): ScannedItem[] {
  const currentYear = new Date().getFullYear();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: ScannedItem[] = [];

  for (const line of lines) {
    let parsed = parsePassbookDate(line) ?? parseMonthDayDate(line, currentYear);
    if (!parsed) continue;

    const { date, rest } = parsed;

    // 行内のすべての金額を抽出（カンマ区切り数字）
    const amountMatches = [...rest.matchAll(/(\d{1,3}(?:,\d{3})+|\d{4,})/g)];
    const amounts = amountMatches
      .map((m) => parseAmount(m[0]))
      .filter((n) => n >= 100); // 100円未満は行番号等の可能性があるので除外

    if (amounts.length === 0) continue;

    // 最後は残高の可能性が高いため除外、その直前が取引金額
    const txAmount = amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[amounts.length - 1];
    if (txAmount <= 0) continue;

    // 摘要: 数字を除いた残りのテキスト
    const desc = rest
      .replace(/(\d{1,3}(?:,\d{3})+|\d{4,})/g, "")
      .replace(/[カ入出引振替金¥￥\s]+$/g, "")
      .trim()
      .replace(/\s+/g, " ");

    if (!desc) continue;

    items.push({ date, description: desc, amount: txAmount, type: "EXPENSE" });
  }

  return items;
}
