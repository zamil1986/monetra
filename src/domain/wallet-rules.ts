import type { DomainError } from "./errors";
import { formatRupiah } from "./money";
import { err, ok, type Result } from "./result";

export const WALLET_COLORS = ["blue", "teal", "olive", "orange", "violet", "magenta", "slate", "brown"] as const;
export const WALLET_ICONS = ["bank", "cash", "ewallet", "savings"] as const;
export type WalletColor = (typeof WALLET_COLORS)[number];
export type WalletIcon = (typeof WALLET_ICONS)[number];

export type WalletInput = { name: string; openingBalance: number; color: string; icon: string };
export type ValidWalletInput = { name: string; openingBalance: number; color: WalletColor; icon: WalletIcon };

const invalid = (field: string, message: string): Result<never, DomainError> =>
  err({ code: "INVALID_WALLET", field, message });

export function validateWalletInput(input: WalletInput): Result<ValidWalletInput, DomainError> {
  const name = input.name.trim();
  if (!name) return invalid("name", "Give the wallet a name.");
  if (name.length > 40) return invalid("name", "Keep the name to 40 characters or fewer.");
  if (!Number.isSafeInteger(input.openingBalance) || input.openingBalance < 0) {
    return invalid("openingBalance", "The opening balance is a whole rupiah amount of 0 or more.");
  }
  if (!(WALLET_COLORS as readonly string[]).includes(input.color)) return invalid("color", "Pick one of the colors.");
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

/** PRD 3.3 rule 6: a Dompet that was ever used is archived, never deleted. */
export function checkDelete(wallet: { transactionCount: number }): Result<void, DomainError> {
  if (wallet.transactionCount === 0) return ok(undefined);
  return err({
    code: "WALLET_IN_USE",
    message: "This wallet has transactions, so it can't be deleted. Archive it instead.",
  });
}
