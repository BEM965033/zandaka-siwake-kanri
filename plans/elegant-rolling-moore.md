# レシート自動リネームスクリプト

## Context

指定フォルダ内のPDF・画像ファイルをClaude Vision APIで解析し、
「購入年月日_相手先名_合計金額」の形式にリネームするCLIスクリプトを追加する。

---

## 方針

- `scripts/rename-receipts.ts` を新規作成（CLIスクリプト）
- `@anthropic-ai/sdk` をインストールして使う
- 既存の `src/lib/ai.ts`（スタブ）は触らない。スクリプト専用として独立させる
- 実行: `tsx scripts/rename-receipts.ts <フォルダパス>`

---

## 実装手順

### 1. パッケージインストール

```bash
npm install @anthropic-ai/sdk
```

### 2. .env に ANTHROPIC_API_KEY を追記

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. scripts/rename-receipts.ts を作成

**ロジックの流れ：**

1. `process.argv[2]` でフォルダパスを受け取る
2. フォルダ内から `.pdf / .jpg / .jpeg / .png / .gif / .webp` をリストアップ
3. 各ファイルを base64 で読み込み
4. Claude API（`claude-opus-4-6`）のビジョン機能で解析
   - PDFは `document` タイプ、画像は `image` タイプで送信
   - プロンプトで JSON 形式（date / vendor / amount）を要求
5. 取得できた値でリネーム: `YYYYMMDD_vendor_amount.ext`
6. 情報取得失敗・同名ファイル衝突時はスキップしてコンソールに警告

**ファイル名サニタイズ:**
- `vendor` フィールドのファイル名不可文字（`\ / : * ? " < > |`）は `_` に置換

**スクリプト骨格：**

```typescript
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new Anthropic(); // ANTHROPIC_API_KEY を環境変数から自動取得

// ① ファイル一覧取得
// ② 各ファイルを base64 に変換
// ③ Claude API に送り、JSON で date/vendor/amount を抽出
// ④ `${date}_${vendor}_${amount}${ext}` にリネーム
// ⑤ 失敗時はスキップ + console.warn
```

### 4. package.json に scripts エントリを追加（任意）

```json
"rename-receipts": "tsx scripts/rename-receipts.ts"
```

→ `npm run rename-receipts -- <フォルダパス>` で実行可能になる

---

## 変更するファイル

| ファイル | 変更内容 |
|---------|----------|
| `scripts/rename-receipts.ts` | 新規作成 |
| `package.json` | `@anthropic-ai/sdk` 追加、`rename-receipts` スクリプト追加 |
| `.env` | `ANTHROPIC_API_KEY` 追記（ユーザーが手動で行う） |

---

## 検証方法

1. テスト用フォルダを作り、サンプルのレシート画像/PDFを数枚置く
2. `tsx scripts/rename-receipts.ts <テストフォルダパス>` を実行
3. コンソールログで処理状況を確認
4. リネーム後のファイル名が `YYYYMMDD_店名_金額.ext` になっているか確認
5. 読み取れないファイルが元のファイル名のまま残っているか確認
