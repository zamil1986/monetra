import { domainError, type DomainError } from "./errors";
import type { MessageKey } from "./i18n";
import { formatRupiah } from "./money";
import { type Color, isColor } from "./palette";
import { err, ok, type Result } from "./result";

export const WALLET_ICONS = ["bank", "cash", "ewallet", "savings"] as const;
export type WalletColor = Color;
export type WalletIcon = (typeof WALLET_ICONS)[number];

export type WalletInput = { name: string; openingBalance: number; color: string; icon: string };
export type ValidWalletInput = { name: string; openingBalance: number; color: WalletColor; icon: WalletIcon };

const invalid = (field: string, key: MessageKey, params?: { max: number }): Result<never, DomainError> =>
  err(domainError("INVALID_WALLET", key, params, field));

export function validateWalletInput(input: WalletInput): Result<ValidWalletInput, DomainError> {
  const name = input.name.trim();
  if (!name) return invalid("name", "error.wallet.nameMissing");
  if (name.length > 40) return invalid("name", "error.name.tooLong", { max: 40 });
  // May be negative: a Saldo is allowed below zero (PRD 3.3 rule 3).
  if (!Number.isSafeInteger(input.openingBalance)) {
    return invalid("openingBalance", "error.wallet.openingWhole");
  }
  if (!isColor(input.color)) return invalid("color", "error.color");
  if (!(WALLET_ICONS as readonly string[]).includes(input.icon)) return invalid("icon", "error.icon");
  return ok({ name, openingBalance: input.openingBalance, color: input.color as WalletColor, icon: input.icon as WalletIcon });
}

/** PRD 3.3 rule 4: a Dompet is archived only at exactly Rp 0. */
export function checkArchive(wallet: { name: string; balance: number }): Result<void, DomainError> {
  if (wallet.balance === 0) return ok(undefined);
  const key = wallet.balance > 0 ? "error.wallet.notEmpty.holds" : "error.wallet.notEmpty.below";
  return err(domainError("WALLET_NOT_EMPTY", key, { name: wallet.name, amount: formatRupiah(wallet.balance) }));
}

/** PRD 3.3 rule 6: a Dompet with Transaksi is archived, never deleted. */
export function checkDelete(wallet: { transactionCount: number }): Result<void, DomainError> {
  if (wallet.transactionCount === 0) return ok(undefined);
  return err(domainError("WALLET_IN_USE", "error.wallet.inUse"));
}

/** An archived Dompet sits at Rp 0 and stays there: it is unarchived before any edit (PRD 3.3 rule 4). */
export function checkEdit(wallet: { name: string; archived: boolean }): Result<void, DomainError> {
  if (!wallet.archived) return ok(undefined);
  return err(domainError("WALLET_ARCHIVED", "error.wallet.archivedEdit", { name: wallet.name }));
}
