import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/api.dart';
import '../data/database.dart';
import '../data/ledger.dart';
import '../data/repository.dart';
import '../data/sync.dart';
import '../domain/i18n.dart';
import '../ui/theme.dart';

final databaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(db.close);
  return db;
});

final apiProvider = Provider<Api>((ref) => Api(TokenStore(), language: () => ref.read(languageProvider).value ?? deviceLanguage()));

/// The phone's own language, used until a Bahasa is picked or the Akun's arrives.
String deviceLanguage() => langFromLocale(WidgetsBinding.instance.platformDispatcher.locale.toLanguageTag());

/// The Bahasa this phone shows: the Akun's (or the one just picked), else the phone's own (ADR 0006).
final languageProvider = StreamProvider<String>((ref) => ref
    .watch(databaseProvider)
    .watchSetting('profile.language')
    .map((v) => isLang(v) ? v! : deviceLanguage()));

/// This phone's Theme (ADR 0007): a setting of the Perangkat, kept through sign-out and never synced.
final themeModeProvider = StreamProvider<ThemeMode>((ref) => ref.watch(databaseProvider).watchSetting('device.theme').map(themeModeOf));

final syncEngineProvider = Provider<SyncEngine>((ref) {
  final engine = SyncEngine(ref.watch(databaseProvider), ref.watch(apiProvider));
  ref.onDispose(engine.dispose);
  return engine;
});

final repositoryProvider = Provider<Repository>(
    (ref) => Repository(ref.watch(databaseProvider), onLocalChange: () => ref.read(syncSchedulerProvider).soon()));

final ledgerProvider = StreamProvider<Ledger>((ref) => ref.watch(repositoryProvider).watchLedger());
final pendingCountProvider = StreamProvider<int>((ref) => ref.watch(repositoryProvider).watchPendingCount());
final syncFailuresProvider = StreamProvider<List<SyncFailureRow>>((ref) => ref.watch(repositoryProvider).watchFailures());
final lastSyncProvider = StreamProvider<String?>((ref) => ref.watch(databaseProvider).watchSetting('sync.lastAt'));

final syncStateProvider = StreamProvider<SyncState>((ref) async* {
  final engine = ref.watch(syncEngineProvider);
  yield engine.last;
  yield* engine.states;
});

/// When to sync (ADR 0005): on start, when the connection returns, when the app comes back to
/// the front, shortly after every local change, and every five minutes while open.
class SyncScheduler with WidgetsBindingObserver {
  /// Tests pass their own `connectivity` and turn the timer off.
  SyncScheduler(this._engine, {Stream<List<ConnectivityResult>>? connectivity, bool periodic = true}) {
    WidgetsBinding.instance.addObserver(this);
    _connectivity = (connectivity ?? Connectivity().onConnectivityChanged).listen((results) {
      if (results.any((r) => r != ConnectivityResult.none)) now();
    });
    if (periodic) _periodic = Timer.periodic(const Duration(minutes: 5), (_) => now());
  }

  final SyncEngine _engine;
  late final StreamSubscription<List<ConnectivityResult>> _connectivity;
  Timer? _periodic;
  Timer? _debounce;

  Future<SyncState> now() => _engine.run();

  void soon() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(seconds: 2), now);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) now();
  }

  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _connectivity.cancel();
    _periodic?.cancel();
    _debounce?.cancel();
  }
}

final syncSchedulerProvider = Provider<SyncScheduler>((ref) {
  final s = SyncScheduler(ref.watch(syncEngineProvider));
  ref.onDispose(s.dispose);
  return s;
});

enum Session { loading, signedOut, signedIn, needsSignIn }

/// signedIn: a token is stored. needsSignIn: the server stopped accepting it (expired, password
/// changed elsewhere); recording carries on offline and syncs again after signing in.
class SessionController extends Notifier<Session> {
  @override
  Session build() {
    _restore();
    ref.listen(syncStateProvider, (_, next) {
      if (next.value == SyncState.signedOut && state == Session.signedIn) state = Session.needsSignIn;
    });
    return Session.loading;
  }

  Api get _api => ref.read(apiProvider);
  AppDatabase get _db => ref.read(databaseProvider);

  Future<void> _restore() async {
    final token = await _api.tokens.read();
    final known = await _db.setting('profile.email');
    state = token != null ? Session.signedIn : (known != null ? Session.needsSignIn : Session.signedOut);
    if (token != null) ref.read(syncSchedulerProvider).now();
  }

  /// Signs in online (the first time always needs a connection), then fetches everything.
  Future<void> signIn(String email, String password) async {
    final known = await _db.setting('profile.email');
    await _api.signIn(email.trim(), password);
    // Another Pengguna on this Perangkat: start from nothing.
    if (known != null && known.toLowerCase() != email.trim().toLowerCase()) await _db.wipe();
    state = Session.signedIn;
    await ref.read(syncSchedulerProvider).now();
  }

  /// The Akun starts in [language], the Bahasa the sign-up screen was shown in.
  Future<void> signUp(String name, String email, String password, String timezone, String language) async {
    await _db.wipe();
    await _api.signUp(name.trim(), email.trim(), password, timezone, language);
    state = Session.signedIn;
    await ref.read(syncSchedulerProvider).now();
  }

  /// Sends what is still queued, then signs out and empties the Perangkat.
  /// Returns false, changing nothing, when queued changes couldn't be sent.
  Future<bool> signOut({bool discardUnsent = false}) async {
    if (!discardUnsent) {
      await ref.read(syncSchedulerProvider).now();
      final pending = await _db.select(_db.outbox).get();
      if (pending.isNotEmpty) return false;
    }
    try {
      await _api.signOut();
    } catch (_) {
      await _api.tokens.clear();
    }
    await _db.wipe();
    state = Session.signedOut;
    return true;
  }
}

final sessionProvider = NotifierProvider<SessionController, Session>(SessionController.new);
