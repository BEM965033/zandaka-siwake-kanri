import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new Anthropic();

const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp']);

const IMAGE_MIME: Record<string, 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

interface ExtractedInfo {
  date: string;
  vendor: string;
  amount: string;
}

async function extractInfo(filePath: string): Promise<ExtractedInfo | null> {
  const ext = path.extname(filePath).toLowerCase();
  const data = fs.readFileSync(filePath).toString('base64');

  const fileContent: Anthropic.MessageParam['content'][number] =
    ext === '.pdf'
      ? {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data },
        }
      : {
          type: 'image',
          source: { type: 'base64', media_type: IMAGE_MIME[ext], data },
        };

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: [
          fileContent,
          {
            type: 'text',
            text: `このレシート・領収書・請求書から以下の情報を抽出してください。
必ずJSON形式のみで返答してください（説明文は不要）。

{
  "date": "YYYYMMDD形式の購入/発行日付（不明な場合はnull）",
  "vendor": "店名または相手先会社名（不明な場合はnull）",
  "amount": "合計金額（数字のみ、円記号・カンマなし。不明な場合はnull）"
}`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  let parsed: { date?: string | null; vendor?: string | null; amount?: string | null };
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }

  if (!parsed.date || !parsed.vendor || !parsed.amount) return null;

  const safeVendor = String(parsed.vendor).replace(/[\\/:*?"<>|]/g, '_').trim();

  return {
    date: String(parsed.date).trim(),
    vendor: safeVendor,
    amount: String(parsed.amount).trim(),
  };
}

async function main() {
  const folderPath = process.argv[2];
  if (!folderPath) {
    console.error('使い方: tsx scripts/rename-receipts.ts <フォルダパス>');
    process.exit(1);
  }

  if (!fs.existsSync(folderPath)) {
    console.error(`フォルダが見つからない: ${folderPath}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(folderPath)
    .filter((f) => SUPPORTED_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .map((f) => path.join(folderPath, f));

  if (files.length === 0) {
    console.log('対象ファイルなし。');
    return;
  }

  console.log(`対象ファイル数: ${files.length}`);

  for (const filePath of files) {
    const ext = path.extname(filePath);
    const originalName = path.basename(filePath);

    try {
      process.stdout.write(`処理中: ${originalName} ... `);
      const info = await extractInfo(filePath);

      if (!info) {
        console.warn(`スキップ（情報抽出失敗）`);
        continue;
      }

      const newName = `${info.date}_${info.vendor}_${info.amount}${ext}`;
      const newPath = path.join(path.dirname(filePath), newName);

      if (newPath !== filePath && fs.existsSync(newPath)) {
        console.warn(`スキップ（同名ファイルが既に存在: ${newName}）`);
        continue;
      }

      fs.renameSync(filePath, newPath);
      console.log(`→ ${newName}`);
    } catch (err) {
      console.warn(`スキップ（エラー: ${err instanceof Error ? err.message : String(err)}）`);
    }
  }

  console.log('完了。');
}

main().catch((err) => {
  console.error('致命的エラー:', err);
  process.exit(1);
});
