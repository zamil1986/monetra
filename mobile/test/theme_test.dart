import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:monetra/data/database.dart';
import 'package:monetra/ui/theme.dart';

/// The Theme belongs to this phone, not the Akun (ADR 0007).
void main() {
  test('a stored Theme maps to its mode, anything else follows the system', () {
    expect(themeModeOf('light'), ThemeMode.light);
    expect(themeModeOf('dark'), ThemeMode.dark);
    expect(themeModeOf('system'), ThemeMode.system);
    expect(themeModeOf(null), ThemeMode.system);
    expect(themeModeOf('sepia'), ThemeMode.system);
    expect([for (final p in themePrefs) themeModeOf(p).name], themePrefs);
  });

  test('signing out keeps the Theme and the Bahasa, and nothing else', () async {
    final db = AppDatabase(NativeDatabase.memory());
    addTearDown(db.close);
    await db.putSetting('device.theme', 'dark');
    await db.putSetting('profile.language', 'id');
    await db.putSetting('sync.lastAt', '2026-11-21T00:00:00Z');

    await db.wipe();

    expect(await db.setting('device.theme'), 'dark');
    expect(await db.setting('profile.language'), 'id');
    expect(await db.setting('sync.lastAt'), isNull);
  });

  test('both palettes carry every hue a Dompet or Kategori can wear', () {
    for (final palette in [MonetraColors.light, MonetraColors.dark]) {
      expect(palette.hues.keys.toSet(), {'green', 'blue', 'teal', 'olive', 'orange', 'violet', 'magenta', 'slate', 'brown'});
      expect(palette.hue('nope'), palette.hues['slate']);
    }
  });
}
