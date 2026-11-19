import type { DomainError } from "./errors";
import { formatRupiah } from "./money";
import { type Color, isColor } from "./palette";
import { err, ok, type Result } from "./result";

export const WALLET_ICONS = ["bank", "cash", "ewallet", "savings"] as const;
export type WalletColor = Color;
export type WalletIcon = (typeof WALLET_ICONS)[number];

export type WalletInput = { name: string; openingBalance: number; color: string; icon: string };
export type ValidWalletInput = { name: string; openingBalance: number; color: WalletColor; icon: WalletIcon };

const invalid = (field: string, message: string): Result<never, DomainError> =>
  err({ code: "INVALID_WALLET", field, message });

export function validateWalletInput(input: WalletInput): Result<ValidWalletInput, DomainError> {
  const name = input.name.trim();
  if (!name) return invalid("name", "Give the wallet a name.");
  if (name.length > 40) return invalid("name", "Keep the name to 40 characters or fewer.");
  // May be negative: a Saldo is allowed below zero (PRD 3.3 rule 3).
  if (!Number.isSafeInteger(input.openingBalance)) {
    return invalid("openingBalance", "The opening balance is a whole rupiah amount.");
  }
  if (!isColor(input.color)) return invalid("color", "Pick one of the colors.");
  if (!(WALLET_ICONS as readonly string[]).includes(input.icon)) return invalid("icon", "Pick one of the icons.");
  return ok({ name, openingBalance: input.openingBalance, color: input.color as WalletColor, icon: input.icon as WalletIcon });
}

/** PRD 3.3 rule 4: a Dompet is archived only at exactly Rp 0. */
export function checkArchive(wallet: { name: string; balance: number }): Result<void, DomainError> {
  if (wallet.balance === 0) return ok(undefined);
  const position = wallet.balance > 0 ? `still holds ${formatRupiah(wallet.balance)}` : `is at ${formatRupiah(wallet.balance)}`;
  return err({
    code: "WALLET_NOT_EMPTY",
    message: `${wallet.name} ${position}. A wallet can be archived only when its balance is exactly Rp 0.`,
  });
}

/** PRD 3.3 rule 6: a Dompet with Transaksi is archived, never deleted. */
export function checkDelete(wallet: { transactionCount: number }): Result<void, DomainError> {
  if (wallet.transactionCount === 0) return ok(undefined);
  return err({
    code: "WALLET_IN_USE",
    message: "This wallet has transactions, so it can't be deleted. Archive it instead.",
  });
}

/** An archived Dompet sits at Rp 0 and stays there: it is unarchived before any edit (PRD 3.3 rule 4). */
export function checkEdit(wallet: { name: string; archived: boolean }): Result<void, DomainError> {
  if (!wallet.archived) return ok(undefined);
  return err({ code: "WALLET_ARCHIVED", message: `${wallet.name} is archived. Unarchive it to make changes.` });
}
