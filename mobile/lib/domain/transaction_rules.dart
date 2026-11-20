import 'i18n.dart';
import 'result.dart';
import 'types.dart';

/// Mirrors src/domain/transaction-rules.ts.
class TransactionDraft {
  const TransactionDraft({
    required this.type,
    required this.amount,
    required this.walletId,
    required this.toWalletId,
    required this.categoryId,
    required this.description,
    required this.occurredAt,
  });
  final TransactionType type;
  final int amount;
  final String walletId;
  final String? toWalletId;
  final String? categoryId;
  final String? description;
  final DateTime occurredAt;

  TransactionDraft copyWith({String? description, bool clearCategory = false}) => TransactionDraft(
        type: type,
        amount: amount,
        walletId: walletId,
        toWalletId: toWalletId,
        categoryId: clearCategory ? null : categoryId,
        description: description ?? this.description,
        occurredAt: occurredAt,
      );
}

/// What the person owns, as seen when the rules run.
class RuleContext {
  const RuleContext({required this.now, required this.wallets, required this.categories});
  final DateTime now;
  final List<({String id, bool archived})> wallets;
  final List<({String id, CategoryType type, bool archived})> categories;
}

/// Device clocks drift; a Transaksi this close to "now" is not treated as future.
const _clockSkew = Duration(seconds: 60);
const maxDescription = 120;

Err<TransactionDraft> _refuse(String field, String key, {Map<String, Object?>? params, String code = 'INVALID_TRANSACTION'}) =>
    Err(DomainError(code, key, params: params, field: field));

Result<TransactionDraft> validateNewTransaction(TransactionDraft draft, RuleContext ctx) => _validate(draft, ctx, null);

/// PRD 3.4 rule 8: a transfer never changes type; income and expense may swap.
Result<TransactionDraft> validateTransactionEdit(TransactionDraft current, TransactionDraft next, RuleContext ctx) {
  final wasTransfer = current.type == TransactionType.transfer;
  if (wasTransfer != (next.type == TransactionType.transfer)) {
    return _refuse(
        'type',
        wasTransfer ? 'error.type.transferToOther' : 'error.type.otherToTransfer',
        code: 'TYPE_CHANGE_NOT_ALLOWED');
  }
  return _validate(next, ctx, current);
}

Result<TransactionDraft> _validate(TransactionDraft d, RuleContext ctx, TransactionDraft? current) {
  if (d.amount <= 0) return _refuse('amount', 'error.amount.positive');
  bool keptWallet(String id) => current != null && (current.walletId == id || current.toWalletId == id);

  final wallet = ctx.wallets.where((w) => w.id == d.walletId).firstOrNull;
  if (wallet == null) return _refuse('walletId', 'error.wallet.choose');
  if (wallet.archived && !keptWallet(wallet.id)) {
    return _refuse('walletId', 'error.wallet.archived');
  }

  if (d.type == TransactionType.transfer) {
    if (d.categoryId != null) return _refuse('categoryId', 'error.transfer.noCategory');
    if (d.toWalletId == null) return _refuse('toWalletId', 'error.transfer.chooseTo');
    if (d.toWalletId == d.walletId) return _refuse('toWalletId', 'error.transfer.sameWallet');
    final to = ctx.wallets.where((w) => w.id == d.toWalletId).firstOrNull;
    if (to == null) return _refuse('toWalletId', 'error.wallet.choose');
    if (to.archived && !keptWallet(to.id)) {
      return _refuse('toWalletId', 'error.wallet.archived');
    }
  } else {
    if (d.toWalletId != null) return _refuse('toWalletId', 'error.transfer.onlyTransferHasTo');
    final choose = d.type == TransactionType.income ? 'error.category.chooseIncome' : 'error.category.chooseExpense';
    final category = ctx.categories.where((c) => c.id == d.categoryId).firstOrNull;
    final wanted = d.type == TransactionType.income ? CategoryType.income : CategoryType.expense;
    if (category == null || category.type != wanted) return _refuse('categoryId', choose);
    if (category.archived && current?.categoryId != category.id) {
      return _refuse('categoryId', 'error.category.archived');
    }
  }

  if (d.occurredAt.isAfter(ctx.now.add(_clockSkew))) return _refuse('occurredAt', 'error.occurredAt.future');

  final description = (d.description?.trim().isEmpty ?? true) ? null : d.description!.trim();
  if (description != null && description.length > maxDescription) {
    return _refuse('description', 'error.description.tooLong', params: {'max': maxDescription});
  }
  return Ok(TransactionDraft(
      type: d.type,
      amount: d.amount,
      walletId: d.walletId,
      toWalletId: d.toWalletId,
      categoryId: d.categoryId,
      description: description,
      occurredAt: d.occurredAt));
}

/// PRD 3.5: description, else category name, else "Transfer to (wallet)". Mirrors presentation.ts.
String transactionTitle(
    {required TransactionType type, String? description, String? categoryName, String? toWalletName, Strings t = const Strings('en')}) {
  if (description != null && description.isNotEmpty) return description;
  if (type == TransactionType.transfer) return t('tx.transferTo', {'wallet': toWalletName ?? t('tx.anotherWallet')});
  return categoryName ?? t('tx.untitled');
}
