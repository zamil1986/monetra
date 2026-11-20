import 'dart:async';
import 'dart:convert';

import 'package:drift/drift.dart';

import '../domain/i18n.dart';
import 'api.dart';
import 'database.dart';

enum SyncState { idle, syncing, offline, signedOut, failed }

/// Sinkronisasi (ADR 0005): push the outbox oldest first, apply the server's merges, then pull
/// everything after the cursor. Safe to call any time; overlapping calls share one run.
class SyncEngine {
  SyncEngine(this.db, this.api);
  final AppDatabase db;
  final Api api;
  final _state = StreamController<SyncState>.broadcast();
  Future<SyncState>? _running;
  SyncState last = SyncState.idle;

  Stream<SyncState> get states => _state.stream;

  static const pushBatch = 200;

  Future<SyncState> run() => _running ??= _run().whenComplete(() => _running = null);

  void _emit(SyncState s) {
    last = s;
    _state.add(s);
  }

  Future<SyncState> _run() async {
    if (await api.tokens.read() == null) {
      _emit(SyncState.signedOut);
      return last;
    }
    _emit(SyncState.syncing);
    try {
      await pushLanguage();
      await pushAll();
      await pullAll();
      await db.putSetting('sync.lastAt', DateTime.now().toUtc().toIso8601String());
      _emit(SyncState.idle);
    } on ApiError catch (e) {
      _emit(e.signedOut ? SyncState.signedOut : SyncState.failed);
    } catch (e) {
      _emit(isOffline(e) ? SyncState.offline : SyncState.failed);
    }
    return last;
  }

  Future<void> pushAll() async {
    while (true) {
      final batch = await (db.select(db.outbox)
            ..orderBy([(o) => OrderingTerm.asc(o.seq)])
            ..limit(pushBatch))
          .get();
      if (batch.isEmpty) return;
      final answer = await api.push(batch.map((o) => jsonDecode(o.body) as Map<String, dynamic>).toList());
      final results = (answer['results'] as List).cast<Map<String, dynamic>>();
      final remap = (answer['remap'] as Map<String, dynamic>? ?? {}).cast<String, String>();
      await db.transaction(() async {
        for (var i = 0; i < batch.length; i++) {
          final r = results[i];
          if (r['status'] == 'rejected') {
            await db.into(db.syncFailures).insert(SyncFailuresCompanion.insert(
                entity: batch[i].entity, entityId: batch[i].entityId, code: r['code'] as String? ?? 'REJECTED',
                message: r['message'] as String? ?? translate(await db.setting('profile.language') ?? defaultLang, 'm.sync.refusedDefault'),
                at: DateTime.now().toUtc()));
          }
          await (db.delete(db.outbox)..where((o) => o.seq.equals(batch[i].seq))).go();
        }
        await applyRemap(remap);
      });
    }
  }

  /// A Bahasa picked on this Perangkat, sent to the Akun. The server keeps whichever choice was made
  /// last, so an older one from a phone that was offline never undoes a newer one (ADR 0006).
  Future<void> pushLanguage() async {
    if (await db.setting('profile.languagePending') != '1') return;
    final language = await db.setting('profile.language');
    final changedAt = await db.setting('profile.languageChangedAt');
    if (!isLang(language)) return db.putSetting('profile.languagePending', '0');
    final kept = await api.setLanguage(language!, changedAt);
    await db.transaction(() async {
      // Picked again while this was on its way: that newer choice still waits to be sent.
      if (await db.setting('profile.languageChangedAt') != changedAt) return;
      await db.putSetting('profile.language', kept);
      await db.putSetting('profile.languagePending', '0');
    });
  }

  /// Kategori kembar: the server kept another Kategori for ours. Point everything at it.
  Future<void> applyRemap(Map<String, String> remap) async {
    for (final MapEntry(key: from, value: to) in remap.entries) {
      await (db.update(db.transactions)..where((t) => t.categoryId.equals(from))).write(TransactionsCompanion(categoryId: Value(to)));
      await (db.delete(db.categories)..where((c) => c.id.equals(from))).go();
      for (final o in await db.select(db.outbox).get()) {
        if (o.body.contains(from)) {
          await (db.update(db.outbox)..where((x) => x.seq.equals(o.seq)))
              .write(OutboxCompanion(body: Value(o.body.replaceAll(from, to))));
        }
      }
    }
  }

  Future<void> pullAll() async {
    var more = true;
    while (more) {
      final page = await api.pull(await db.setting('sync.cursor') ?? '0');
      await db.transaction(() async {
        final pending = (await db.select(db.outbox).get()).map((o) => o.entityId).toSet();
        // A change still waiting in the outbox is newer than what the server had; keep ours.
        bool skip(Map<String, dynamic> r) => pending.contains(r['id']);
        DateTime? at(Object? s) => s == null ? null : DateTime.parse(s as String);

        for (final w in (page['wallets'] as List).cast<Map<String, dynamic>>().where((r) => !skip(r))) {
          await db.into(db.wallets).insertOnConflictUpdate(WalletRow(
              id: w['id'], name: w['name'], openingBalance: w['openingBalance'], color: w['color'], icon: w['icon'],
              archivedAt: at(w['archivedAt']), deletedAt: at(w['deletedAt']), clientUpdatedAt: at(w['clientUpdatedAt'])!,
              createdAt: at(w['createdAt'])!));
        }
        for (final c in (page['categories'] as List).cast<Map<String, dynamic>>().where((r) => !skip(r))) {
          await db.into(db.categories).insertOnConflictUpdate(CategoryRow(
              id: c['id'], name: c['name'], type: c['type'], color: c['color'], icon: c['icon'],
              archivedAt: at(c['archivedAt']), deletedAt: at(c['deletedAt']), clientUpdatedAt: at(c['clientUpdatedAt'])!,
              createdAt: at(c['createdAt'])!));
        }
        for (final t in (page['transactions'] as List).cast<Map<String, dynamic>>().where((r) => !skip(r))) {
          await db.into(db.transactions).insertOnConflictUpdate(TransactionRow(
              id: t['id'], type: t['type'], amount: t['amount'], walletId: t['walletId'], toWalletId: t['toWalletId'],
              categoryId: t['categoryId'], description: t['description'], occurredAt: at(t['occurredAt'])!,
              deletedAt: at(t['deletedAt']), clientUpdatedAt: at(t['clientUpdatedAt'])!, createdAt: at(t['createdAt'])!));
        }
        final profile = page['profile'] as Map<String, dynamic>;
        await db.putSetting('profile.name', profile['name'] as String);
        await db.putSetting('profile.email', profile['email'] as String);
        await db.putSetting('profile.timezone', profile['timezone'] as String);
        // The Akun's Bahasa, unless this Perangkat holds a newer choice not sent yet.
        if (isLang(profile['language']) && await db.setting('profile.languagePending') != '1') {
          await db.putSetting('profile.language', profile['language'] as String);
        }
        await db.putSetting('sync.cursor', page['cursor'] as String);
      });
      more = page['more'] == true;
    }
  }

  void dispose() => _state.close();
}
