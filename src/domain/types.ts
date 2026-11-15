export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";
export type CategoryType = "INCOME" | "EXPENSE";

/** The part of a Transaksi that moves money. Amounts are whole rupiah. */
export type Movement = {
  type: TransactionType;
  amount: number;
  walletId: string;
  toWalletId: string | null;
};

export type WalletState = {
  id: string;
  openingBalance: number;
  archived: boolean;
};
