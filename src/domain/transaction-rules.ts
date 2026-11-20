import { domainError, type DomainError } from "./errors";
import type { MessageKey, Params } from "./i18n";
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

const refuse = (field: keyof TransactionDraft, key: MessageKey, params?: Params, code = "INVALID_TRANSACTION") =>
  err<DomainError>(domainError(code, key, params, field));

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
      current.type === "TRANSFER" ? "error.type.transferToOther" : "error.type.otherToTransfer",
      undefined,
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
    return refuse("amount", "error.amount.positive");
  }

  // An archived Dompet or Kategori can stay on a Transaksi that already had it, but can't be newly chosen.
  // A Transfer may swap its two wallets, so either side counts as "already had".
  const keptWallet = (id: string) => current !== null && (current.walletId === id || current.toWalletId === id);
  const keptCategory = (id: string) => current?.categoryId === id;

  const wallet = ctx.wallets.find((w) => w.id === draft.walletId);
  if (!wallet) return refuse("walletId", "error.wallet.choose");
  if (wallet.archived && !keptWallet(wallet.id)) {
    return refuse("walletId", "error.wallet.archived");
  }

  if (draft.type === "TRANSFER") {
    if (draft.categoryId !== null) return refuse("categoryId", "error.transfer.noCategory");
    if (!draft.toWalletId) return refuse("toWalletId", "error.transfer.chooseTo");
    if (draft.toWalletId === draft.walletId) return refuse("toWalletId", "error.transfer.sameWallet");
    const to = ctx.wallets.find((w) => w.id === draft.toWalletId);
    if (!to) return refuse("toWalletId", "error.wallet.choose");
    if (to.archived && !keptWallet(to.id)) {
      return refuse("toWalletId", "error.wallet.archived");
    }
  } else {
    if (draft.toWalletId !== null) return refuse("toWalletId", "error.transfer.onlyTransferHasTo");
    const choose = draft.type === "INCOME" ? "error.category.chooseIncome" : "error.category.chooseExpense";
    if (!draft.categoryId) return refuse("categoryId", choose);
    const category = ctx.categories.find((c) => c.id === draft.categoryId);
    if (!category || category.type !== draft.type) return refuse("categoryId", choose);
    if (category.archived && !keptCategory(category.id)) {
      return refuse("categoryId", "error.category.archived");
    }
  }

  if (Number.isNaN(draft.occurredAt.getTime())) return refuse("occurredAt", "error.occurredAt.missing");
  if (draft.occurredAt.getTime() > ctx.now.getTime() + CLOCK_SKEW_MS) {
    return refuse("occurredAt", "error.occurredAt.future");
  }

  const description = draft.description?.trim() || null;
  if (description && description.length > MAX_DESCRIPTION) {
    return refuse("description", "error.description.tooLong", { max: MAX_DESCRIPTION });
  }

  return ok({ ...draft, description });
}
