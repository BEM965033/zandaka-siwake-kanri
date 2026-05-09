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
  // "22./29.350,000" のようなゴミ行
  return /^\d+[\.\/]\d+[\.\/]/.test(line);
}

function isLikelyAmount(line: string): boolean {
  return /^[¥￥]?\s*[\d,]+\s*$/.test(line);
}

export function parseOcrText(text: string): ScannedItem[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: ScannedItem[] = [];

  // 日付でセクション分割
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

  // 各セクションから内容と金額を抽出
  for (const { date, lines: sectionLines } of sections) {
    const descLines: string[] = [];
    const amounts: number[] = [];

    for (const line of sectionLines) {
      if (isLikelyNoise(line)) {
        // ノイズ行でも数字は拾う
        amounts.push(...extractNumbers(line));
        continue;
      }
      if (isLikelyAmount(line)) {
        amounts.push(...extractNumbers(line));
        continue;
      }
      // 数字を含む行でも説明テキストがあれば両方処理
      const nums = extractNumbers(line);
      if (nums.length > 0) amounts.push(...nums);
      // 日本語または英字を含む行は説明扱い
      if (/[ぁ-ん゠-ヿ一-鿿ｦ-ﾟA-Za-z\*]/.test(line)) {
        descLines.push(line);
      }
    }

    if (descLines.length === 0 || amounts.length === 0) continue;

    // 最大の金額を取引金額として採用（残高より取引額の方が小さい場合もあるので最初の金額を優先）
    const amount = amounts[0];
    const description = descLines.join(" ").replace(/\s+/g, " ").trim();

    items.push({ date, description, amount, type: "EXPENSE" });
  }

  return items;
}
