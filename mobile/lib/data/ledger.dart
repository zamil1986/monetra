import '../domain/balance.dart';
import '../domain/period.dart';
import '../domain/transaction_rules.dart';
import '../domain/types.dart';
import 'database.dart';

/// Everything the screens show, read from the local database: what the Pengguna owns as of
/// now on this Perangkat, deletion marks left out.
class Ledger {
  Ledger({required this.wallets, required this.categories, required this.transactions, required this.timezone, required this.profileName, required this.profileEmail}) {
    _walletById = {for (final w in wallets) w.id: w};
    _categoryById = {for (final c in categories) c.id: c};
    balances = balancesByWallet(_states, transactions.map(movementOf));
    total = totalBalance(_states, transactions.map(movementOf));
  }

  final List<WalletRow> wallets;
  final List<CategoryRow> categories;
  /// Newest first.
  final List<TransactionRow> transactions;
  final String timezone;
  final String? profileName;
  final String? profileEmail;
  late final Map<String, int> balances;
  late final int total;
  late final Map<String, WalletRow> _walletById;
  late final Map<String, CategoryRow> _categoryById;

  List<WalletState> get _states =>
      wallets.map((w) => WalletState(id: w.id, openingBalance: w.openingBalance, archived: w.archivedAt != null)).toList();

  static Movement movementOf(TransactionRow t) =>
      Movement(type: transactionTypeFrom(t.type), amount: t.amount, walletId: t.walletId, toWalletId: t.toWalletId);

  WalletRow? wallet(String? id) => id == null ? null : _walletById[id];
  CategoryRow? category(String? id) => id == null ? null : _categoryById[id];
  List<WalletRow> get activeWallets => wallets.where((w) => w.archivedAt == null).toList();
  List<CategoryRow> categoriesOf(CategoryType type, {bool includeArchived = false}) =>
      categories.where((c) => c.type == wire(type) && (includeArchived || c.archivedAt == null)).toList();

  int usesOfWallet(String id) => transactions.where((t) => t.walletId == id || t.toWalletId == id).length;
  int usesOfCategory(String id) => transactions.where((t) => t.categoryId == id).length;

  String titleOf(TransactionRow t) => transactionTitle(
      type: transactionTypeFrom(t.type),
      description: t.description,
      categoryName: category(t.categoryId)?.name,
      toWalletName: wallet(t.toWalletId)?.name);

  /// The Periode's Income, Expense and Net Cash Flow, plus its dates.
  ({String from, String to, int income, int expense, int net}) flow(Period period, DateTime now) {
    final r = periodRange(period, now, timezone);
    final inside = transactions.where((t) => !t.occurredAt.isBefore(r.start) && t.occurredAt.isBefore(r.endExclusive));
    final f = cashFlow(inside.map((t) => (type: transactionTypeFrom(t.type), amount: t.amount)));
    return (from: r.from, to: r.to, income: f.income, expense: f.expense, net: f.net);
  }

  RuleContext ruleContext(DateTime now) => RuleContext(
        now: now,
        wallets: wallets.map((w) => (id: w.id, archived: w.archivedAt != null)).toList(),
        categories: categories.map((c) => (id: c.id, type: categoryTypeFrom(c.type), archived: c.archivedAt != null)).toList(),
      );
}
