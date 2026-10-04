import { GoogleGenAI, MediaResolution, Type } from "@google/genai";

export interface ScannedItem {
  date: string;
  description: string;
  amount: number;
  type: "EXPENSE" | "INCOME";
  memo?: string;
}

interface RawItem extends ScannedItem {
  rawLine?: string;
  balance?: number | null;
}

function buildPrompt(): string {
  const year = new Date().getFullYear();
  return `この通帳・銀行明細の画像から取引データを抽出してください。

通帳のレイアウト：
- 1行が1取引。列は「日付／摘要／お支払金額（出金）／お預り金額（入金）／差引残高」。
- 金額は1つしか書かれていないので、出金列にあるか入金列にあるかを列の位置で判断すること。
- 「返済回数」「6/120回目」「証書貸付」の補足行は独立した取引ではなく、直前の取引の摘要の一部。
- 印字は半角カナ（ATM・機械印字）が多い。1取引が2行にわたることがあり、金額のない次行のカナ文字（振込人名・送金先名）は、その直前の金額のある行の摘要の続き。次の取引に混ぜないこと。
- 行の右余白などに手書きメモ（「水道光熱費」「小遣」など）があれば、読み取って memo に入れる。手書きは摘要（description）には入れず、description は印字から読む。手書きがない行の memo は空文字。
- 取引の件数は「金額が印字されている行」の数と一致させる。金額のない行（振込人名だけの行、返済回数だけの行）を独立した取引にしない。
- 各取引は、まず rawLine にその1行を左から右へ印字どおりに書き写し（日付・摘要・金額・記号＊も含める）、その rawLine の内容だけから他の項目を決めること。上下の行の摘要や金額を持ってこない。
- 行をまたいで摘要・金額・残高を混ぜないこと。必ず同じ横一行の内容を1件にまとめる。

行の対応のしかた（形式の説明のみ。この例の数字・文字は画像と無関係なので、出力には絶対に使わないこと）：
  - 「日付 摘要A 金額X」の次に「摘要Aの続きの名前だけの行（金額なし）」があれば、1件にまとめる。
  - 金額と摘要は、必ず同じ横一行同士を対応させる。
  - 画像に書かれていない値を推測・創作しない。読み取れない行は、読み取れた範囲だけを出力する。
- 上から下へ、通帳に印字された順に出力すること。読み取れない行は飛ばさず、確信がなければ最も近い値を入れる。
- 各取引に、その行の差引残高も balance として必ず入れること（読み取れなければ null）。

ルール：
- 出金・支払い・引き落とし・振込出 → "EXPENSE"
- 入金・振込入・預け入れ・年金 → "INCOME"
- 金額・残高はカンマなしの整数
- 日付の年が画像に明記されていない場合は必ず ${year} 年を使用すること。2000年など過去の年は絶対に使わないこと。
- 和暦（令和）の場合：令和7年＝2025年、令和8年＝2026年`;
}

// 残高の増減と突き合わせて、種別・金額のズレを補正する
function reconcile(items: RawItem[]): ScannedItem[] {
  return items.map((item, i) => {
    const { balance, rawLine: _rawLine, ...base } = item;
    const rest = {
      ...base,
      description: base.description.normalize("NFKC").trim(),
      memo: base.memo?.trim() || undefined,
    };
    const prev = i > 0 ? items[i - 1].balance : null;
    if (balance == null || prev == null) return rest;

    const diff = balance - prev;
    if (diff === 0) return rest;
    // 金額が残高差と一致するなら種別は残高の増減が正しい
    if (Math.abs(diff) === rest.amount) {
      return { ...rest, type: diff > 0 ? "INCOME" : "EXPENSE" };
    }
    console.warn(`残高が合いません: ${rest.date} ${rest.description} 金額${rest.amount} 残高差${diff}`);
    return rest;
  });
}

// gemini-2.5-flash は新規ユーザーに提供終了のため使わない。混雑(503)時は待って再試行し、最後に軽量モデルへ
const MODELS = ["gemini-3.8-flash", "gemini-2.5-flash-lite"];
const RETRIES_PER_MODEL = 3;

async function generateWithRetry(
  ai: GoogleGenAI,
  contents: Parameters<GoogleGenAI["models"]["generateContent"]>[0]["contents"],
  config: Parameters<GoogleGenAI["models"]["generateContent"]>[0]["config"]
) {
  let lastError: unknown;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < RETRIES_PER_MODEL; attempt++) {
      try {
        return await ai.models.generateContent({ model, contents, config });
      } catch (e) {
        lastError = e;
        const status = (e as { status?: number }).status;
        if (status !== 503 && status !== 429) throw e;
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

export async function scanBankStatement(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<ScannedItem[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const contents = [
    {
      parts: [
        { inlineData: { mimeType, data: imageBase64 } },
        { text: buildPrompt() },
      ],
    },
  ];
  const config = {
      temperature: 0,
      thinkingConfig: { thinkingBudget: 8192 },
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          propertyOrdering: ["rawLine", "date", "description", "amount", "type", "memo", "balance"],
          properties: {
            rawLine: { type: Type.STRING, description: "その1行の印字を左から右へ書き写したもの" },
            date: { type: Type.STRING, description: "YYYY-MM-DD" },
            description: { type: Type.STRING },
            amount: { type: Type.INTEGER },
            type: { type: Type.STRING, enum: ["EXPENSE", "INCOME"] },
            memo: { type: Type.STRING, description: "手書きメモ。なければ空文字" },
            balance: { type: Type.INTEGER, nullable: true },
          },
          required: ["rawLine", "date", "description", "amount", "type"],
        },
      },
  };

  const response = await generateWithRetry(ai, contents, config);
  const text = response.text ?? "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  return reconcile(JSON.parse(jsonMatch[0]) as RawItem[]);
}
