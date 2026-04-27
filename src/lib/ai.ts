import Anthropic from "@anthropic-ai/sdk";

export interface ScannedItem {
  date: string;
  description: string;
  amount: number;
  type: "EXPENSE" | "INCOME";
}

export async function scanBankStatement(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<ScannedItem[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mimeType, data: imageBase64 },
          },
          {
            type: "text",
            text: `この通帳・銀行明細の画像から取引データを抽出してください。
JSONの配列のみ返してください。各要素は以下の形式：
[
  {
    "date": "YYYY-MM-DD",
    "description": "摘要テキスト",
    "amount": 正の整数,
    "type": "EXPENSE" または "INCOME"
  }
]
ルール：
- 出金・支払い・引き落とし・振込出 → "EXPENSE"
- 入金・振込入・預け入れ → "INCOME"
- 金額はカンマなしの正の整数
- 年が不明な場合は現在の西暦を使用
- JSONのみ返すこと。説明・マークダウン不要。`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "[]";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  return JSON.parse(jsonMatch[0]) as ScannedItem[];
}
