// The real app on an in-memory database, offline: the server can't be reached at all.
import 'package:dio/dio.dart';
import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:monetra/app/providers.dart';
import 'package:monetra/app/router.dart';
import 'package:monetra/data/api.dart';
import 'package:monetra/data/database.dart';
import 'package:monetra/ui/theme.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;

class MemoryTokens extends TokenStore {
  MemoryTokens(this.token);
  String? token;
  @override
  Future<String?> read() async => token;
  @override
  Future<void> write(String t) async => token = t;
  @override
  Future<void> clear() async => token = null;
}

/// A Perangkat that already synced once: Dina's Tunai and BCA, two Kategori.
Future<AppDatabase> seeded() async {
  final db = AppDatabase(NativeDatabase.memory());
  final t0 = DateTime.utc(2026, 11, 1);
  await db.batch((b) {
    b.insertAll(db.wallets, [
      WalletRow(id: 'w-tunai', name: 'Tunai', openingBalance: 100000, color: 'olive', icon: 'cash', clientUpdatedAt: t0, createdAt: t0),
      WalletRow(id: 'w-bca', name: 'BCA', openingBalance: 2000000, color: 'blue', icon: 'bank', clientUpdatedAt: t0, createdAt: t0),
    ]);
    b.insertAll(db.categories, [
      CategoryRow(id: 'c-makan', name: 'Makanan', type: 'EXPENSE', color: 'orange', icon: 'utensils', clientUpdatedAt: t0, createdAt: t0),
      CategoryRow(id: 'c-gaji', name: 'Gaji', type: 'INCOME', color: 'green', icon: 'briefcase', clientUpdatedAt: t0, createdAt: t0),
    ]);
    b.insert(db.transactions, TransactionRow(id: 't-1', type: 'EXPENSE', amount: 25000, walletId: 'w-tunai', categoryId: 'c-makan',
        description: 'Ojek', occurredAt: DateTime.now().toUtc().subtract(const Duration(hours: 1)), clientUpdatedAt: t0, createdAt: t0));
  });
  for (final (k, v) in [('profile.email', 'dina@example.com'), ('profile.name', 'Dina'), ('profile.timezone', 'Asia/Jakarta')]) {
    await db.putSetting(k, v);
  }
  return db;
}

Future<(ProviderContainer, AppDatabase)> pumpApp(WidgetTester tester, {String? language}) async {
  // A phone-width screen, tall enough that every section is built.
  tester.view.devicePixelRatio = 2.75;
  tester.view.physicalSize = const Size(393 * 2.75, 1800 * 2.75);
  addTearDown(tester.view.reset);
  final db = await seeded();
  if (language != null) await db.putSetting('profile.language', language);
  final container = ProviderContainer(overrides: [
    databaseProvider.overrideWithValue(db),
    // Nothing listens on this port: every request fails as if there were no signal.
    apiProvider.overrideWithValue(Api(MemoryTokens('token'), dio: Dio(BaseOptions(baseUrl: 'http://127.0.0.1:9')))),
    syncSchedulerProvider.overrideWith((ref) {
      final s = SyncScheduler(ref.watch(syncEngineProvider), connectivity: const Stream.empty(), periodic: false);
      ref.onDispose(s.dispose);
      return s;
    }),
  ]);
  await tester.pumpWidget(UncontrolledProviderScope(
    container: container,
    // As in main.dart: the locale follows the Bahasa, and every screen reads it from there.
    child: Consumer(
        builder: (context, ref, _) => MaterialApp.router(
              theme: monetraTheme(Brightness.light),
              darkTheme: monetraTheme(Brightness.dark),
              themeMode: ref.watch(themeModeProvider).value ?? ThemeMode.system,
              routerConfig: ref.watch(routerProvider),
              locale: Locale(ref.watch(languageProvider).value ?? 'en'),
              supportedLocales: const [Locale('en'), Locale('id')],
              localizationsDelegates: GlobalMaterialLocalizations.delegates,
            )),
  ));
  await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 300)));
  await tester.pumpAndSettle();
  return (container, db);
}

void main() {
  tzdata.initializeTimeZones();
  driftRuntimeOptions.dontWarnAboutMultipleDatabases = true;

  testWidgets('the dashboard shows Saldo and Total Balance from data on the phone', (tester) async {
    final (container, db) = await pumpApp(tester);
    expect(find.text('Total balance'), findsOneWidget);
    expect(find.text('Rp 2.075.000'), findsOneWidget); // 100.000 − 25.000 + 2.000.000
    expect(find.text('Rp 75.000'), findsOneWidget); // Tunai
    expect(find.text('Ojek'), findsOneWidget);
    await tester.runAsync(db.close);
    container.dispose();
  });

  testWidgets('recording an Expense offline updates the Saldo at once and queues it for sync', (tester) async {
    final (container, db) = await pumpApp(tester);
    await tester.tap(find.byTooltip('Add transaction'));
    await tester.pumpAndSettle();
    expect(find.text('Add transaction'), findsOneWidget);

    await tester.enterText(find.byType(TextField).first, '18000');
    await tester.pump();
    expect(find.text('18.000'), findsOneWidget); // grouped as typed

    await tester.tap(find.text('Makanan')); // Category chips are all in view
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, 'Kopi susu');

    await tester.runAsync(() async {
      await tester.tap(find.text('Save transaction'));
      await Future<void>.delayed(const Duration(milliseconds: 300));
    });
    await tester.pumpAndSettle();

    expect(find.text('Kopi susu'), findsOneWidget);
    expect(find.text('Rp 2.057.000'), findsOneWidget);
    // Saving says so, says where it is, and offers Undo.
    expect(find.textContaining('Saved expense of Rp 18.000.'), findsOneWidget);
    expect(find.textContaining('Saved on this phone'), findsOneWidget);
    expect(find.text('Undo'), findsOneWidget);
    final outbox = await tester.runAsync(() => db.select(db.outbox).get());
    expect(outbox, hasLength(1));
    expect(outbox!.single.body, contains('"amount":18000'));
    await tester.runAsync(db.close);
    container.dispose();
  });

  testWidgets('the app speaks the Akun\'s Bahasa, and switching it offline shows at once and queues it (ADR 0006)', (tester) async {
    final (container, db) = await pumpApp(tester, language: 'id');
    expect(find.text('Total Saldo'), findsOneWidget);
    expect(find.text('Beranda'), findsOneWidget);
    expect(find.text('Arus Kas Bersih'), findsOneWidget);

    await tester.tap(find.text('Lainnya'));
    await tester.pumpAndSettle();
    await tester.runAsync(() async {
      await tester.tap(find.text('English'));
      await Future<void>.delayed(const Duration(milliseconds: 300));
    });
    await tester.pumpAndSettle();
    expect(find.text('More'), findsWidgets);
    expect(find.text('Lainnya'), findsNothing);
    expect(await tester.runAsync(() => db.setting('profile.language')), 'en');
    expect(await tester.runAsync(() => db.setting('profile.languagePending')), '1');
    await tester.runAsync(db.close);
    container.dispose();
  });

  testWidgets('picking Dark in More turns this phone dark at once and keeps it on the phone only (ADR 0007)', (tester) async {
    final (container, db) = await pumpApp(tester);
    BuildContext screen() => tester.element(find.byType(Scaffold).last);
    expect(Theme.of(screen()).brightness, Brightness.light);

    await tester.tap(find.text('More'));
    await tester.pumpAndSettle();
    await tester.runAsync(() async {
      await tester.tap(find.text('Dark'));
      await Future<void>.delayed(const Duration(milliseconds: 300));
    });
    await tester.pumpAndSettle();

    expect(Theme.of(screen()).brightness, Brightness.dark);
    expect(Theme.of(screen()).scaffoldBackgroundColor, MonetraColors.dark.paper);
    expect(await tester.runAsync(() => db.setting('device.theme')), 'dark');
    final outbox = await tester.runAsync(() => db.select(db.outbox).get());
    expect(outbox, isEmpty); // not synced to the Akun
    await tester.runAsync(db.close);
    container.dispose();
  });
}
