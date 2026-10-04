import { getCashAccounts, getCashBook } from "@/actions/cashbook";
import { CashBookView } from "@/components/cash-book/CashBookView";

export const dynamic = "force-dynamic";

// 日本時間の今日を yyyy-mm-dd で返す
function todayInTokyo() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

export default async function CashBookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const cashAccounts = await getCashAccounts();

  if (cashAccounts.length === 0) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-lg font-semibold text-gray-900 mb-5">現金出納帳</h1>
        <p className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-sm text-gray-400 text-center">
          現金口座がありません。口座設定で種別「手元現金」の口座を追加してください。
        </p>
      </div>
    );
  }

  const today = todayInTokyo();
  const accountId = cashAccounts.some((a) => a.id === params.accountId)
    ? params.accountId
    : cashAccounts[0].id;
  // 期間の既定は今月1日〜今日
  const dateFrom = params.dateFrom || `${today.slice(0, 8)}01`;
  const dateTo = params.dateTo || today;

  const book = await getCashBook({ accountId, dateFrom, dateTo });

  return (
    <div className="max-w-5xl mx-auto">
      <CashBookView
        cashAccounts={cashAccounts}
        accountId={accountId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        today={today}
        book={"error" in book ? null : book}
        error={"error" in book ? book.error : null}
      />
    </div>
  );
}
