import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 print:block print:h-auto print:overflow-visible print:bg-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">{children}</main>
    </div>
  );
}
