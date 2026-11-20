// Two Perangkat against a real Monetra server (ADR 0005). Needs `npm run dev` on the Mac:
//   MONETRA_E2E=http://localhost:3000 flutter test test/sync_e2e_test.dart
import 'dart:io';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:monetra/data/api.dart';
import 'package:monetra/data/database.dart';
import 'package:monetra/data/repository.dart';
import 'package:monetra/data/sync.dart';
import 'package:monetra/domain/result.dart';
import 'package:monetra/domain/transaction_rules.dart';
import 'package:monetra/domain/types.dart';

class MemoryTokens extends TokenStore {
  String? token;
  @override
  Future<String?> read() async => token;
  @override
  Future<void> write(String t) async => token = t;
  @override
  Future<void> clear() async => token = null;
}

class Perangkat {
  Perangkat(String server) {
    db = AppDatabase(NativeDatabase.memory());
    api = Api(MemoryTokens(), dio: Dio(BaseOptions(baseUrl: server)));
    repo = Repository(db);
    sync = SyncEngine(db, api);
  }
  late final AppDatabase db;
  late final Api api;
  late final Repository repo;
  late final SyncEngine sync;
}

void main() {
  // Each Perangkat has its own in-memory database on purpose.
  driftRuntimeOptions.dontWarnAboutMultipleDatabases = true;
  final server = Platform.environment['MONETRA_E2E'];
  final email = 'e2e-${Random().nextInt(1 << 32)}@example.com';
  const password = 'e2e-password-1';

  test('a Transaksi recorded offline on the phone reaches the other Perangkat with the same Saldo', () async {
    final phone = Perangkat(server!);
    await phone.api.signUp('E2E', email, password, 'Asia/Jakarta', 'en');
    expect(await phone.sync.run(), SyncState.idle);
    var l = await phone.repo.ledger();
    final tunai = l.wallets.single;
    final makanan = l.categories.firstWhere((c) => c.name == 'Makanan');

    // Offline: written locally and queued; the Saldo changes at once.
    final saved = await phone.repo.saveTransaction(TransactionDraft(
        type: TransactionType.expense, amount: 24000, walletId: tunai.id, toWalletId: null,
        categoryId: makanan.id, description: 'Lunch', occurredAt: DateTime.now().toUtc()));
    expect(saved, isA<Ok<String>>());
    expect((await phone.repo.ledger()).balances[tunai.id], -24000);
    expect(await phone.db.select(phone.db.outbox).get(), hasLength(1));

    // Back online.
    expect(await phone.sync.run(), SyncState.idle);
    expect(await phone.db.select(phone.db.outbox).get(), isEmpty);

    final mac = Perangkat(server);
    await mac.api.signIn(email, password);
    await mac.sync.run();
    l = await mac.repo.ledger();
    expect(l.transactions.map((t) => t.description), ['Lunch']);
    expect(l.balances[tunai.id], -24000);
    expect(l.total, (await phone.repo.ledger()).total);
  }, skip: server == null ? 'set MONETRA_E2E to the server URL' : false);

  test('a delete on one Perangkat wins over an edit queued on the other', () async {
    final phone = Perangkat(server!);
    await phone.api.signIn(email, password);
    await phone.sync.run();
    final mac = Perangkat(server);
    await mac.api.signIn(email, password);
    await mac.sync.run();
    final t = (await phone.repo.ledger()).transactions.single;

    await mac.repo.deleteTransaction(t.id);
    await mac.sync.run();

    // The phone edits it offline, later by its clock, then syncs.
    await phone.repo.saveTransaction(
        TransactionDraft(type: TransactionType.expense, amount: 99000, walletId: t.walletId, toWalletId: null,
            categoryId: t.categoryId, description: 'Edited offline', occurredAt: t.occurredAt),
        id: t.id);
    await phone.sync.run();
    // The pull skipped it while the edit was queued; it is gone after the next one.
    await phone.sync.run();
    expect((await phone.repo.ledger()).transactions, isEmpty);
  }, skip: server == null ? 'set MONETRA_E2E to the server URL' : false);

  test('a Bahasa picked offline on the phone reaches the Akun, and an older choice never wins (ADR 0006)', () async {
    final phone = Perangkat(server!);
    await phone.api.signIn(email, password);
    await phone.sync.run();
    final mac = Perangkat(server);
    await mac.api.signIn(email, password);
    await mac.sync.run();

    // Picked offline on the phone: shows at once, waits for the next sync.
    await phone.repo.setLanguage('id', forAccount: true);
    expect(await phone.db.setting('profile.language'), 'id');
    await phone.sync.run();
    expect(await phone.db.setting('profile.languagePending'), '0');
    await mac.sync.run();
    expect(await mac.db.setting('profile.language'), 'id');

    // An older choice arriving late is dropped by the server, and the phone takes the Akun's.
    expect(await phone.api.setLanguage('en', DateTime.now().toUtc().subtract(const Duration(days: 1)).toIso8601String()), 'id');
    await phone.repo.setLanguage('en', forAccount: true);
    await phone.sync.run();
    await mac.sync.run();
    expect(await mac.db.setting('profile.language'), 'en');
  }, skip: server == null ? 'set MONETRA_E2E to the server URL' : false);

  test('two Perangkat creating the same Kategori offline end with one', () async {
    final phone = Perangkat(server!);
    await phone.api.signIn(email, password);
    await phone.sync.run();
    final mac = Perangkat(server);
    await mac.api.signIn(email, password);
    await mac.sync.run();

    await mac.repo.saveCategory((name: 'Kopi', icon: 'coffee', color: 'brown'), CategoryType.expense);
    final local = await phone.repo.saveCategory((name: 'kopi', icon: 'coffee', color: 'teal'), CategoryType.expense);
    final phoneKopi = (local as Ok<String>).value;
    final l = await phone.repo.ledger();
    await phone.repo.saveTransaction(TransactionDraft(
        type: TransactionType.expense, amount: 18000, walletId: l.wallets.single.id, toWalletId: null,
        categoryId: phoneKopi, description: 'Kopi susu', occurredAt: DateTime.now().toUtc()));

    await mac.sync.run();
    await phone.sync.run();
    await mac.sync.run();

    for (final p in [phone, mac]) {
      final ledger = await p.repo.ledger();
      final kopi = ledger.categories.where((c) => c.name.toLowerCase() == 'kopi').toList();
      expect(kopi, hasLength(1));
      expect(ledger.transactions.firstWhere((t) => t.description == 'Kopi susu').categoryId, kopi.single.id);
    }
  }, skip: server == null ? 'set MONETRA_E2E to the server URL' : false);
}
