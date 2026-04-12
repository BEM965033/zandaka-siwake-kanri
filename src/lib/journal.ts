import { getAccountLedgerName } from "./utils";

export interface JournalEntryInput {
  lineNo: number;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
}

interface JournalBuildParams {
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  amount: number;
  description: string;
  fromAccountType?: string;
  toAccountType?: string;
  categoryDebitAccount?: string | null;
  categoryCreditAccount?: string | null;
}

export function buildJournalEntries(params: JournalBuildParams): JournalEntryInput[] {
  const { type, amount, description, fromAccountType, toAccountType, categoryDebitAccount, categoryCreditAccount } = params;

  if (type === "EXPENSE") {
    const debitName = categoryDebitAccount ?? "費用";
    const creditName = fromAccountType ? getAccountLedgerName(fromAccountType) : "現金";
    return [
      { lineNo: 1, accountName: debitName, debit: amount, credit: 0, description },
      { lineNo: 2, accountName: creditName, debit: 0, credit: amount, description },
    ];
  }

  if (type === "INCOME") {
    const debitName = toAccountType ? getAccountLedgerName(toAccountType) : "現金";
    const creditName = categoryCreditAccount ?? "売上";
    return [
      { lineNo: 1, accountName: debitName, debit: amount, credit: 0, description },
      { lineNo: 2, accountName: creditName, debit: 0, credit: amount, description },
    ];
  }

  // TRANSFER
  const debitName = toAccountType ? getAccountLedgerName(toAccountType) : "現金";
  const creditName = fromAccountType ? getAccountLedgerName(fromAccountType) : "普通預金";
  return [
    { lineNo: 1, accountName: debitName, debit: amount, credit: 0, description },
    { lineNo: 2, accountName: creditName, debit: 0, credit: amount, description },
  ];
}
