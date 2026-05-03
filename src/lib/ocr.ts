import type { ScannedItem } from "@/types";

function parseAmount(raw: string): number {
  const n = parseInt(raw.replace(/[¥￥,\s]/g, ""), 10);
  return isNaN(n) ? 0 : Math.abs(n);
}

export function parseOcrText(text: string): ScannedItem[] {
  const year = new Date().getFullYear();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: ScannedItem[] = [];

  for (const line of lines) {
    // 行頭の日付を探す (例: 4/1, 4/01, 04/01, 4.1)
    const dateMatch = line.match(/^(\d{1,2})[\/\.]\s*(\d{1,2})/);
    if (!dateMatch) continue;

    const month = dateMatch[1].padStart(2, "0");
    const day   = dateMatch[2].padStart(2, "0");
    const date  = `${year}-${month}-${day}`;

    // 行内のすべての金額を抽出
    const amountMatches = [...line.matchAll(/[¥￥]?\s*(\d{1,3}(?:,\d{3})*)/g)];
    const amounts = amountMatches
      .map((m) => parseAmount(m[0]))
      .filter((n) => n >= 10); // 1桁の数字は日付の一部なので除外

    if (amounts.length === 0) continue;

    // 最後の金額は残高、その直前が取引金額（残高がない場合は最後が取引金額）
    const txAmount = amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[amounts.length - 1];
    if (txAmount <= 0) continue;

    // 摘要：日付の後ろ〜金額の前のテキスト
    const afterDate = line.slice(dateMatch[0].length).trim();
    const desc = afterDate.replace(/[¥￥]?\s*\d{1,3}(?:,\d{3})*\s*/g, "").trim();
    if (!desc) continue;

    items.push({ date, description: desc, amount: txAmount, type: "EXPENSE" });
  }

  return items;
}
