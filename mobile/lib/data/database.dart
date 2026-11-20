import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

part 'database.g.dart';

/// The Perangkat's copy of the Pengguna's data (ADR 0005). Rows mirror the server's, deletion
/// marks included, so Saldo and Dashboard work with no connection.

@DataClassName('WalletRow')
class Wallets extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  IntColumn get openingBalance => integer()();
  TextColumn get color => text()();
  TextColumn get icon => text()();
  DateTimeColumn get archivedAt => dateTime().nullable()();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  DateTimeColumn get clientUpdatedAt => dateTime()();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('CategoryRow')
class Categories extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  /// INCOME or EXPENSE, as the server writes it.
  TextColumn get type => text()();
  TextColumn get color => text()();
  TextColumn get icon => text()();
  DateTimeColumn get archivedAt => dateTime().nullable()();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  DateTimeColumn get clientUpdatedAt => dateTime()();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('TransactionRow')
class Transactions extends Table {
  TextColumn get id => text()();
  /// INCOME, EXPENSE or TRANSFER.
  TextColumn get type => text()();
  IntColumn get amount => integer()();
  TextColumn get walletId => text()();
  TextColumn get toWalletId => text().nullable()();
  TextColumn get categoryId => text().nullable()();
  TextColumn get description => text().nullable()();
  DateTimeColumn get occurredAt => dateTime()();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  DateTimeColumn get clientUpdatedAt => dateTime()();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

/// Changes made here and not yet accepted by the server, oldest first.
@DataClassName('OutboxRow')
class Outbox extends Table {
  IntColumn get seq => integer().autoIncrement()();
  TextColumn get entity => text()();
  TextColumn get entityId => text()();
  /// upsert or delete.
  TextColumn get op => text()();
  /// The mutation as the push endpoint expects it, JSON.
  TextColumn get body => text()();
}

/// Changes the server refused, kept so the Pengguna can see why and fix them.
@DataClassName('SyncFailureRow')
class SyncFailures extends Table {
  IntColumn get seq => integer().autoIncrement()();
  TextColumn get entity => text()();
  TextColumn get entityId => text()();
  TextColumn get code => text()();
  TextColumn get message => text()();
  DateTimeColumn get at => dateTime()();
}

/// Small facts: the pull cursor and the profile (name, email, time zone, Bahasa).
@DataClassName('SettingRow')
class Settings extends Table {
  TextColumn get key => text()();
  TextColumn get value => text()();

  @override
  Set<Column> get primaryKey => {key};
}

@DriftDatabase(tables: [Wallets, Categories, Transactions, Outbox, SyncFailures, Settings])
class AppDatabase extends _$AppDatabase {
  AppDatabase([QueryExecutor? executor]) : super(executor ?? driftDatabase(name: 'monetra'));

  @override
  int get schemaVersion => 1;

  Future<String?> setting(String key) async =>
      (await (select(settings)..where((s) => s.key.equals(key))).getSingleOrNull())?.value;

  Future<void> putSetting(String key, String value) =>
      into(settings).insertOnConflictUpdate(SettingsCompanion.insert(key: key, value: value));

  Stream<String?> watchSetting(String key) =>
      (select(settings)..where((s) => s.key.equals(key))).watchSingleOrNull().map((r) => r?.value);

  /// Everything goes on sign-out (after the outbox has been sent), except the Bahasa and the Theme:
  /// the sign-in screen stays in the language the phone was just using (ADR 0006), and the Theme
  /// belongs to the Perangkat, not the Akun (ADR 0007).
  Future<void> wipe() => transaction(() async {
        final kept = {for (final key in _keptOnWipe) key: await setting(key)};
        for (final table in allTables) {
          await delete(table).go();
        }
        for (final MapEntry(:key, :value) in kept.entries) {
          if (value != null) await putSetting(key, value);
        }
      });

  static const _keptOnWipe = ['profile.language', 'device.theme'];
}
