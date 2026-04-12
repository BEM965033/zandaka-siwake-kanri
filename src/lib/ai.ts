// AI提案機能（将来拡張用スタブ）
// 将来的にClaude APIを使ってカテゴリ提案・仕訳候補を返す

export interface AISuggestion {
  categoryId?: string;
  categoryName?: string;
  confidence: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function suggestCategory(description: string, amount: number): Promise<AISuggestion | null> {
  // TODO: Claude APIを使って提案を返す実装
  return null;
}
