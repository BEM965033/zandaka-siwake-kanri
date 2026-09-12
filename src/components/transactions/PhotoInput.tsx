"use client";

import { useRef, useState } from "react";
import { compressImageToDataUrl } from "@/lib/image";
import { Camera, Loader2, X } from "lucide-react";

interface Props {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  /** 指定するとフォーム送信用のhidden inputを出力する */
  name?: string;
  compact?: boolean;
}

export function PhotoInput({ value, onChange, name, compact = false }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);
    try {
      onChange(await compressImageToDataUrl(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "画像の読み込みに失敗しました");
    } finally {
      setIsProcessing(false);
      // 同じファイルを再選択できるようにクリアしておく
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {name && <input type="hidden" name={name} value={value ?? ""} />}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {value ? (
        <div className="relative inline-block">
          {/* 圧縮済みdata URLのためnext/imageは使わない */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="添付写真"
            className={compact ? "h-16 w-16 rounded border border-gray-200 object-cover" : "h-32 w-32 rounded-lg border border-gray-200 object-cover"}
          />
          <button
            type="button"
            onClick={() => { onChange(null); setError(null); }}
            className="absolute -right-2 -top-2 rounded-full bg-gray-900 p-1 text-white shadow hover:bg-gray-700 transition-colors"
            aria-label="写真を削除"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isProcessing}
          className={`flex items-center gap-2 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50 ${compact ? "px-2.5 py-1.5 text-xs" : "px-4 py-2.5 text-sm"}`}
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {isProcessing ? "読み込み中…" : "写真を選ぶ"}
        </button>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
