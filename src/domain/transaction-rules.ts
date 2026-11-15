import type { DomainError } from "./errors";
import { err, ok, type Result } from "./result";
import type { CategoryType, TransactionType } from "./types";

export type TransactionDraft = {
  type: TransactionType;
  amount: number;
  walletId: string;
  toWalletId: string | null;
  categoryId: string | null;
  description: string | null;
  occurredAt: Date;
};

export type TransactionPatch = Partial<TransactionDraft>;

/** What the person owns, as seen when the rules run. Anything missing here is not theirs. */
export type RuleContext = {
  now: Date;
  wallets: { id: string; archived: boolean }[];
  categories: { id: string; type: CategoryType; archived: boolean }[];
};

/** Device clocks drift; a Transaksi this close to "now" is not treated as future. */
const CLOCK_SKEW_MS = 60_000;
const MAX_DESCRIPTION = 120;

const refuse = (field: keyof TransactionDraft, message: string, code = "INVALID_TRANSACTION") =>
  err<DomainError>({ code, field, message });

/** PRD 3.4 business rules for a Transaksi being recorded for the first time. */
export function validateNewTransaction(draft: TransactionDraft, ctx: RuleContext): Result<TransactionDraft, DomainError> {
  return validate(draft, ctx, null);
}

/**
 * PRD 3.4 rule 8: amount, wallet, time, description and category may change; income and
 * expense may swap (category picked again); a transfer never changes type.
 */
export function validateTransactionEdit(
  current: TransactionDraft,
  patch: TransactionPatch,
  ctx: RuleContext,
): Result<TransactionDraft, DomainError> {
  const nextType = patch.type ?? current.type;
  if ((current.type === "TRANSFER") !== (nextType === "TRANSFER")) {
    return refuse(
      "type",
      current.type === "TRANSFER"
        ? "A transfer can't become income or expense. Delete it and record the right type instead."
        : "An income or expense can't become a transfer. Delete it and record a transfer instead.",
      "TYPE_CHANGE_NOT_ALLOWED",
    );
  }
  const next: TransactionDraft = { ...current, ...patch };
  if (nextType !== current.type && patch.categoryId === undefined) {
    next.categoryId = null; // the old category belongs to the other type
  }
  return validate(next, ctx, current);
}

function validate(
  draft: TransactionDraft,
  ctx: RuleContext,
  current: TransactionDraft | null,
): Result<TransactionDraft, DomainError> {
  if (!Number.isSafeInteger(draft.amount) || draft.amount <= 0) {
    return refuse("amount", "Enter a whole rupiah amount above 0.");
  }

  // An archived Dompet or Kategori can stay on a Transaksi that already had it, but can't be newly chosen.
  // A Transfer may swap its two wallets, so either side counts as "already had".
  const keptWallet = (id: string) => current !== null && (current.walletId === id || current.toWalletId === id);
  const keptCategory = (id: string) => current?.categoryId === id;

  const wallet = ctx.wallets.find((w) => w.id === draft.walletId);
  if (!wallet) return refuse("walletId", "Choose one of your wallets.");
  if (wallet.archived && !keptWallet(wallet.id)) {
    return refuse("walletId", "That wallet is archived. Unarchive it or choose another one.");
  }

  if (draft.type === "TRANSFER") {
    if (draft.categoryId !== null) return refuse("categoryId", "A transfer has no category.");
    if (!draft.toWalletId) return refuse("toWalletId", "Choose the wallet the money goes to.");
    if (draft.toWalletId === draft.walletId) return refuse("toWalletId", "Pick two different wallets.");
    const to = ctx.wallets.find((w) => w.id === draft.toWalletId);
    if (!to) return refuse("toWalletId", "Choose one of your wallets.");
    if (to.archived && !keptWallet(to.id)) {
      return refuse("toWalletId", "That wallet is archived. Unarchive it or choose another one.");
    }
  } else {
    if (draft.toWalletId !== null) return refuse("toWalletId", "Only a transfer has a destination wallet.");
    const label = draft.type === "INCOME" ? "an income" : "an expense";
    if (!draft.categoryId) return refuse("categoryId", `Choose ${label} category.`);
    const category = ctx.categories.find((c) => c.id === draft.categoryId);
    if (!category || category.type !== draft.type) return refuse("categoryId", `Choose ${label} category.`);
    if (category.archived && !keptCategory(category.id)) {
      return refuse("categoryId", "That category is archived. Choose another one.");
    }
  }

  if (Number.isNaN(draft.occurredAt.getTime())) return refuse("occurredAt", "Enter a date and time.");
  if (draft.occurredAt.getTime() > ctx.now.getTime() + CLOCK_SKEW_MS) {
    return refuse("occurredAt", "The time can't be in the future.");
  }

  const description = draft.description?.trim() || null;
  if (description && description.length > MAX_DESCRIPTION) {
    return refuse("description", `Keep the description to ${MAX_DESCRIPTION} characters or fewer.`);
  }

  return ok({ ...draft, description });
}
