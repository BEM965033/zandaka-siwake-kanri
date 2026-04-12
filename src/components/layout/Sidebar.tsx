"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PlusCircle,
  List,
  Building2,
  Tag,
} from "lucide-react";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/transactions/new", label: "取引入力", icon: PlusCircle },
  { href: "/transactions", label: "履歴一覧", icon: List },
  { href: "/accounts", label: "口座設定", icon: Building2 },
  { href: "/categories", label: "カテゴリ設定", icon: Tag },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col h-full">
      <div className="px-5 py-5 border-b border-gray-200">
        <h1 className="text-base font-bold text-gray-900 leading-tight">
          残高仕分け管理
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">資金管理・簡易仕訳</p>
      </div>
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-5 py-2.5 text-sm transition-colors",
                active
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
