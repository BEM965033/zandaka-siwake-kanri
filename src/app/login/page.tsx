"use client";

import { useActionState } from "react";
import { login } from "@/actions/auth";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl border border-gray-200 w-full max-w-sm shadow-sm">
        <div className="mb-6">
          <h1 className="text-base font-bold text-gray-900">残高仕分け管理</h1>
          <p className="text-xs text-gray-400 mt-0.5">パスワードを入力</p>
        </div>
        <form action={formAction} className="space-y-4">
          <input
            type="password"
            name="password"
            placeholder="パスワード"
            autoFocus
            autoComplete="current-password"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {state?.error && (
            <p className="text-xs text-red-600">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? "確認中…" : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}
