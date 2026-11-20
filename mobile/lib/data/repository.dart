import 'dart:async';
import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../domain/balance.dart';
import '../domain/category_rules.dart';
import '../domain/result.dart';
import '../domain/transaction_rules.dart';
import '../domain/types.dart';
import '../domain/wallet_rules.dart' as wallet_rules;
import 'database.dart';
import 'ledger.dart';

const defaultTimezone = 'Asia/Jakarta';

/// Every change the Pengguna makes on this Perangkat: checked by the same rules as the server,
/// written to the local database, and queued in the outbox in one database transaction.
class Repository {
  Repository(this.db, {this.onLocalChange});
  final AppDatabase db;
  /// Called after each local write, so a sync can follow.
  final void Function()? onLocalChange;
  static const _uuid = Uuid();

  /// The ledger now, and again after every change to the local data (ours or a sync's).
  Stream<Ledger> watchLedger() async* {
    yield await ledger();
    final tables = TableUpdateQuery.onAllTables([db.wallets, db.categories, db.transactions, db.settings]);
    await for (final _ in db.tableUpdates(tables)) {
      yield await ledger();
    }
  }

  Future<Ledger> ledger() async {
    final wallets = await (db.select(db.wallets)
          ..where((w) => w.deletedAt.isNull())
          ..orderBy([(w) => OrderingTerm.asc(w.createdAt)]))
        .get();
    final categories = await (db.select(db.categories)
          ..where((c) => c.deletedAt.isNull())
          ..orderBy([(c) => OrderingTerm.asc(c.createdAt), (c) => OrderingTerm.asc(c.id)]))
        .get();
    final transactions = await (db.select(db.transactions)
          ..where((t) => t.deletedAt.isNull())
          ..orderBy([(t) => OrderingTerm.desc(t.occurredAt), (t) => OrderingTerm.desc(t.createdAt)]))
        .get();
    return Ledger(
      wallets: wallets,
      categories: categories,
      transactions: transactions,
      timezone: await db.setting('profile.timezone') ?? defaultTimezone,
      profileName: await db.setting('profile.name'),
      profileEmail: await db.setting('profile.email'),
    );
  }

  /// Picks the Bahasa. It shows at once; signed in, it is also queued for the Akun so every
  /// Perangkat follows, and the newest choice wins (ADR 0006). Signed out it stays on this phone.
  Future<void> setLanguage(String language, {required bool forAccount}) async {
    await db.transaction(() async {
      await db.putSetting('profile.language', language);
      if (forAccount) {
        await db.putSetting('profile.languageChangedAt', _iso(_stamp(null)));
        await db.putSetting('profile.languagePending', '1');
      }
    });
    if (forAccount) onLocalChange?.call();
  }

  Stream<int> watchPendingCount() => db.select(db.outbox).watch().map((rows) => rows.length);
  Stream<List<SyncFailureRow>> watchFailures() => db.select(db.syncFailures).watch();
  Future<void> dismissFailures() => db.delete(db.syncFailures).go();

  /// The Perangkat's clock, but never earlier than the record's last edit, so a clock that went
  /// back doesn't make our own newer edit look older (ADR 0005).
  DateTime _stamp(DateTime? previous) {
    final now = DateTime.now().toUtc();
    if (previous == null || now.isAfter(previous)) return now;
    return previous.toUtc().add(const Duration(milliseconds: 1));
  }

  String _iso(DateTime? d) => d?.toUtc().toIso8601String() ?? '';

  Future<void> _queue(String entity, String id, String op, DateTime at, [Map<String, Object?>? fields]) async {
    final body = {'entity': entity, 'op': op, 'id': id, 'clientUpdatedAt': _iso(at), 'fields': ?fields};
    await db.into(db.outbox).insert(OutboxCompanion.insert(entity: entity, entityId: id, op: op, body: jsonEncode(body)));
  }

  Map<String, Object?> _walletFields(WalletRow w) => {
        'name': w.name, 'openingBalance': w.openingBalance, 'color': w.color, 'icon': w.icon,
        'archivedAt': w.archivedAt == null ? null : _iso(w.archivedAt),
      };
  Map<String, Object?> _categoryFields(CategoryRow c) => {
        'name': c.name, 'type': c.type, 'color': c.color, 'icon': c.icon,
        'archivedAt': c.archivedAt == null ? null : _iso(c.archivedAt),
      };
  Map<String, Object?> _transactionFields(TransactionRow t) => {
        'type': t.type, 'amount': t.amount, 'walletId': t.walletId, 'toWalletId': t.toWalletId,
        'categoryId': t.categoryId, 'description': t.description, 'occurredAt': _iso(t.occurredAt),
      };

  Future<T> _write<T>(Future<T> Function() body) async {
    final result = await db.transaction(body);
    onLocalChange?.call();
    return result;
  }

  // Transaksi

  Future<Result<String>> saveTransaction(TransactionDraft draft, {String? id}) async {
    final l = await ledger();
    final existing = id == null ? null : await (db.select(db.transactions)..where((t) => t.id.equals(id))).getSingleOrNull();
    final current = existing == null
        ? null
        : TransactionDraft(
            type: transactionTypeFrom(existing.type), amount: existing.amount, walletId: existing.walletId,
            toWalletId: existing.toWalletId, categoryId: existing.categoryId, description: existing.description,
            occurredAt: existing.occurredAt);
    final now = DateTime.now().toUtc();
    final valid = current == null ? validateNewTransaction(draft, l.ruleContext(now)) : validateTransactionEdit(current, draft, l.ruleContext(now));
    if (valid is Err<TransactionDraft>) return Err(valid.error);
    final v = (valid as Ok<TransactionDraft>).value;
    final rowId = id ?? _uuid.v4();
    return _write(() async {
      final row = TransactionRow(
        id: rowId, type: wire(v.type), amount: v.amount, walletId: v.walletId, toWalletId: v.toWalletId,
        categoryId: v.categoryId, description: v.description, occurredAt: v.occurredAt.toUtc(), deletedAt: null,
        clientUpdatedAt: _stamp(existing?.clientUpdatedAt), createdAt: existing?.createdAt ?? now,
      );
      await db.into(db.transactions).insertOnConflictUpdate(row);
      await _queue('transaction', rowId, 'upsert', row.clientUpdatedAt, _transactionFields(row));
      return Ok(rowId);
    });
  }

  Future<void> deleteTransaction(String id) => _write(() async {
        final row = await (db.select(db.transactions)..where((t) => t.id.equals(id))).getSingle();
        final at = _stamp(row.clientUpdatedAt);
        await db.update(db.transactions).replace(row.copyWith(deletedAt: Value(at), clientUpdatedAt: at));
        await _queue('transaction', id, 'delete', at);
      });

  // Dompet

  Future<WalletRow> _wallet(String id) => (db.select(db.wallets)..where((w) => w.id.equals(id))).getSingle();

  Future<Result<String>> saveWallet(wallet_rules.WalletInput input, {String? id}) async {
    final existing = id == null ? null : await _wallet(id);
    if (existing != null) {
      final editable = wallet_rules.checkEdit(name: existing.name, archived: existing.archivedAt != null);
      if (editable is Err<void>) return Err(editable.error);
    }
    final valid = wallet_rules.validateWalletInput(input);
    if (valid is Err<wallet_rules.WalletInput>) return Err(valid.error);
    final v = (valid as Ok<wallet_rules.WalletInput>).value;
    final rowId = id ?? _uuid.v4();
    return _write(() async {
      final row = WalletRow(
        id: rowId, name: v.name, openingBalance: v.openingBalance, color: v.color, icon: v.icon,
        archivedAt: existing?.archivedAt, deletedAt: null, clientUpdatedAt: _stamp(existing?.clientUpdatedAt),
        createdAt: existing?.createdAt ?? DateTime.now().toUtc(),
      );
      await db.into(db.wallets).insertOnConflictUpdate(row);
      await _queue('wallet', rowId, 'upsert', row.clientUpdatedAt, _walletFields(row));
      return Ok(rowId);
    });
  }

  Future<Result<void>> setWalletArchived(String id, bool archived) async {
    final w = await _wallet(id);
    if (archived) {
      final l = await ledger();
      final check = wallet_rules.checkArchive(name: w.name, balance: l.balances[id] ?? 0);
      if (check is Err<void>) return check;
    }
    return _write(() async {
      final at = _stamp(w.clientUpdatedAt);
      final row = w.copyWith(archivedAt: Value(archived ? DateTime.now().toUtc() : null), clientUpdatedAt: at);
      await db.update(db.wallets).replace(row);
      await _queue('wallet', id, 'upsert', at, _walletFields(row));
      return const Ok(null);
    });
  }

  Future<Result<void>> deleteWallet(String id) async {
    final l = await ledger();
    final check = wallet_rules.checkDelete(transactionCount: l.usesOfWallet(id));
    if (check is Err<void>) return check;
    final w = await _wallet(id);
    return _write(() async {
      final at = _stamp(w.clientUpdatedAt);
      await db.update(db.wallets).replace(w.copyWith(deletedAt: Value(at), clientUpdatedAt: at));
      await _queue('wallet', id, 'delete', at);
      return const Ok(null);
    });
  }

  // Kategori

  Future<CategoryRow> _category(String id) => (db.select(db.categories)..where((c) => c.id.equals(id))).getSingle();

  List<ExistingCategory> _existing(Ledger l) => l.categories
      .map((c) => ExistingCategory(id: c.id, name: c.name, type: categoryTypeFrom(c.type), archived: c.archivedAt != null))
      .toList();

  Future<Result<String>> saveCategory(CategoryInput input, CategoryType type, {String? id}) async {
    final l = await ledger();
    final existing = id == null ? null : await _category(id);
    final valid = validateCategoryInput(input, type, _existing(l), id);
    if (valid is Err<CategoryInput>) return Err(valid.error);
    final v = (valid as Ok<CategoryInput>).value;
    final rowId = id ?? _uuid.v4();
    return _write(() async {
      final row = CategoryRow(
        id: rowId, name: v.name, type: wire(type), color: v.color, icon: v.icon, archivedAt: existing?.archivedAt,
        deletedAt: null, clientUpdatedAt: _stamp(existing?.clientUpdatedAt), createdAt: existing?.createdAt ?? DateTime.now().toUtc(),
      );
      await db.into(db.categories).insertOnConflictUpdate(row);
      await _queue('category', rowId, 'upsert', row.clientUpdatedAt, _categoryFields(row));
      return Ok(rowId);
    });
  }

  Future<Result<void>> setCategoryArchived(String id, bool archived) async {
    final c = await _category(id);
    if (archived) {
      final l = await ledger();
      final type = categoryTypeFrom(c.type);
      final check = checkLeavesOneActive(type: type, archived: c.archivedAt != null, activeOfSameType: l.categoriesOf(type).length);
      if (check is Err<void>) return check;
    }
    return _write(() async {
      final at = _stamp(c.clientUpdatedAt);
      final row = c.copyWith(archivedAt: Value(archived ? DateTime.now().toUtc() : null), clientUpdatedAt: at);
      await db.update(db.categories).replace(row);
      await _queue('category', id, 'upsert', at, _categoryFields(row));
      return const Ok(null);
    });
  }

  Future<Result<void>> deleteCategory(String id) async {
    final l = await ledger();
    final c = await _category(id);
    final used = checkCategoryDelete(transactionCount: l.usesOfCategory(id));
    if (used is Err<void>) return used;
    final type = categoryTypeFrom(c.type);
    final last = checkLeavesOneActive(type: type, archived: c.archivedAt != null, activeOfSameType: l.categoriesOf(type).length);
    if (last is Err<void>) return last;
    return _write(() async {
      final at = _stamp(c.clientUpdatedAt);
      await db.update(db.categories).replace(c.copyWith(deletedAt: Value(at), clientUpdatedAt: at));
      await _queue('category', id, 'delete', at);
      return const Ok(null);
    });
  }

  /// Saldo of one Dompet right now, for forms that need it.
  Future<int> balanceOf(String walletId) async {
    final l = await ledger();
    return balancesByWallet(
        [WalletState(id: walletId, openingBalance: l.wallet(walletId)?.openingBalance ?? 0, archived: false)],
        l.transactions.map(Ledger.movementOf))[walletId] ?? 0;
  }
}
