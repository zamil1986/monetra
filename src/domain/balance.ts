import type { Movement, WalletState } from "./types";

/**
 * Saldo per Dompet: Saldo awal plus everything in, minus everything out.
 * Movements may be single Transaksi or pre-summed groups; the arithmetic is the same.
 */
export function balancesByWallet(wallets: WalletState[], movements: Movement[]): Map<string, number> {
  const balances = new Map(wallets.map((w) => [w.id, w.openingBalance]));
  const add = (walletId: string, delta: number) => {
    const current = balances.get(walletId);
    if (current !== undefined) balances.set(walletId, current + delta);
  };
  for (const m of movements) {
    if (m.type === "INCOME") add(m.walletId, m.amount);
    else if (m.type === "EXPENSE") add(m.walletId, -m.amount);
    else {
      add(m.walletId, -m.amount);
      if (m.toWalletId) add(m.toWalletId, m.amount);
    }
  }
  return balances;
}

/** Sum of the Saldo of every active Dompet. */
export function totalBalance(wallets: WalletState[], movements: Movement[]): number {
  const balances = balancesByWallet(wallets, movements);
  return wallets.filter((w) => !w.archived).reduce((sum, w) => sum + (balances.get(w.id) ?? 0), 0);
}
