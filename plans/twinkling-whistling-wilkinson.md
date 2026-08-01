# Status: 完了

インストール済み。プラグインのオン・オフは Manage Plugins → **Plugins タブ**で操作可能。

---

# Context

`anthropics/skills` マーケットプレイスはすでに登録・ダウンロード済み。
`claude-api` プラグインは有効化済みだが、`document-skills`（xlsx / pdf / docx / pptx を含むグループ）はまだ有効化されていない。

xlsx と pdf を使えるようにする。

---

## 現状

| 状態 | 内容 |
|------|------|
| マーケットプレイス登録済み | `anthropic-agent-skills` → `~/.claude/settings.json` に記載あり |
| ローカルにダウンロード済み | `~/.claude/plugins/marketplaces/anthropic-agent-skills/skills/xlsx/` 等 |
| 有効化済み | `claude-api` のみ |
| **未有効化** | `document-skills`（xlsx, pdf, docx, pptx） |

---

## プラン

### ステップ 1 — `document-skills` プラグインを有効化

Claude Code のチャット画面で以下を実行：

```
/plugin install document-skills@anthropic-agent-skills
```

これにより xlsx / pdf / docx / pptx の 4 スキルが一括で有効化される。

---

## 有効化後に使えるスキル

| スキル | 主な機能 |
|--------|---------|
| xlsx | .xlsx / .xlsm / .csv の読み書き・数式計算（recalc.py） |
| pdf | テキスト抽出・フォーム入力・PDF 作成（pypdf, pdfplumber, reportlab） |
| docx | Word ドキュメントの操作 |
| pptx | PowerPoint の操作 |

優先順位通り xlsx → pdf の順で動作確認する。

---

## 確認方法

有効化後、Claude Code に以下のように話しかけて動作確認：

- xlsx: 「このExcelファイルを読んで」→ xlsx スキルが自動トリガーされるか確認
- pdf: 「このPDFのテキストを抽出して」→ pdf スキルが自動トリガーされるか確認
