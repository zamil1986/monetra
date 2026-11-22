// Whole screens rendered with the real fonts, for review: see dart_test.yaml. Not a pass/fail check.
@Tags(['golden'])
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;

import 'app_test.dart' show pumpApp;

Future<void> loadFont(String family, String asset) async {
  final loader = FontLoader(family)..addFont(rootBundle.load(asset));
  await loader.load();
}

void main() {
  tzdata.initializeTimeZones();

  setUpAll(() async {
    await loadFont('Archivo', 'assets/fonts/Archivo.ttf');
    await loadFont('packages/lucide_icons_flutter/Lucide', 'packages/lucide_icons_flutter/assets/lucide.ttf');
  });

  /// Renders the app after [steps] and writes goldens/[name]_[theme].png, then tears down outside the fake clock.
  Future<void> shoot(WidgetTester tester, String name, String theme, Future<void> Function() steps, {double height = 900}) async {
    final (container, db) = await pumpApp(tester, theme: theme, height: height);
    await steps();
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/${name}_$theme.png'));
    await tester.pumpWidget(const SizedBox());
    await tester.runAsync(() async {
      container.dispose();
      await db.close();
    });
  }

  for (final theme in ['light', 'dark']) {
    testWidgets('Dashboard, $theme', (tester) async {
      final (container, db) = await pumpApp(tester, theme: theme, height: 1900);
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/dashboard_$theme.png'));
      // Unmount first, so no screen still listens to the database while it closes.
      await tester.pumpWidget(const SizedBox());
      // Drift closes its streams on a real timer, so the teardown runs outside the fake clock.
      await tester.runAsync(() async {
        container.dispose();
        await db.close();
      });
    });

    testWidgets('Add transaction, $theme', (tester) async {
      final (container, db) = await pumpApp(tester, theme: theme, height: 900);
      await tester.tap(find.byTooltip('Add transaction'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).first, '18000');
      await tester.pumpAndSettle();
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/add_$theme.png'));
      // Unmount first, so no screen still listens to the database while it closes.
      await tester.pumpWidget(const SizedBox());
      // Drift closes its streams on a real timer, so the teardown runs outside the fake clock.
      await tester.runAsync(() async {
        container.dispose();
        await db.close();
      });
    });

    testWidgets('Transactions, $theme', (tester) => shoot(tester, 'transactions', theme, () async {
          await tester.tap(find.text('Transactions').last);
          await tester.pumpAndSettle();
        }));

    testWidgets('Wallets, $theme', (tester) => shoot(tester, 'wallets', theme, () async {
          await tester.tap(find.text('Wallets').last);
          await tester.pumpAndSettle();
        }));

    testWidgets('More, $theme', (tester) => shoot(tester, 'more', theme, () async {
          await tester.tap(find.text('More').last);
          await tester.pumpAndSettle();
        }, height: 1500));

    testWidgets('Categories and the delete confirmation, $theme', (tester) => shoot(tester, 'categories_delete', theme, () async {
          await tester.tap(find.text('More').last);
          await tester.pumpAndSettle();
          await tester.tap(find.text('Categories'));
          await tester.pumpAndSettle();
          await tester.tap(find.text('Income'));
          await tester.pumpAndSettle();
          await tester.tap(find.byIcon(LucideIcons.ellipsisVertical).first);
          await tester.pumpAndSettle();
          await tester.tap(find.text('Delete').last);
          await tester.pumpAndSettle();
        }));

    testWidgets('Saved snackbar, $theme', (tester) => shoot(tester, 'saved', theme, () async {
          await tester.tap(find.byTooltip('Add transaction'));
          await tester.pumpAndSettle();
          await tester.enterText(find.byType(TextField).first, '18000');
          await tester.tap(find.text('Makanan'));
          await tester.pumpAndSettle();
          await tester.runAsync(() async {
            await tester.tap(find.text('Save transaction'));
            await Future<void>.delayed(const Duration(milliseconds: 300));
          });
          await tester.pumpAndSettle();
        }));
  }
}
