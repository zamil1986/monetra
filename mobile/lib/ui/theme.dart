import 'package:flutter/material.dart';

/// Tokens from src/app/globals.css, so the phone and the web read as one product.
abstract final class C {
  static const cobalt = Color(0xFF1B3FAB);
  static const cobaltDeep = Color(0xFF142F86);
  static const cobaltSoft = Color(0xFFE7ECFA);
  static const onCobalt = Color(0xFFCFD9FA);
  static const paper = Color(0xFFFBFCFD);
  static const panel = Color(0xFFF1F4F8);
  static const line = Color(0xFFD9DEE6);
  static const field = Color(0xFF7B8491);
  static const ink = Color(0xFF14161A);
  static const ink2 = Color(0xFF454D59);
  static const ink3 = Color(0xFF656D79);
  static const red = Color(0xFFD0261C);
  static const redSoft = Color(0xFFFDECEA);
  static const green = Color(0xFF0B7343);
  static const greenSoft = Color(0xFFE4F3EA);
  static const amber = Color(0xFF8F5400);
  static const amberSoft = Color(0xFFFFF1CC);
  static const yellow = Color(0xFFFFD83A);
}

/// Hues a Dompet or Kategori can wear (src/domain/palette.ts).
const hues = <String, Color>{
  'green': C.green,
  'blue': Color(0xFF2A5BD7),
  'teal': Color(0xFF0B8C8C),
  'olive': Color(0xFF5E7A12),
  'orange': Color(0xFFC95F12),
  'violet': Color(0xFF7A3FC4),
  'magenta': Color(0xFFB8296F),
  'slate': Color(0xFF48566A),
  'brown': Color(0xFF8A5A2B),
};

Color hue(String? name) => hues[name] ?? hues['slate']!;

/// Figures use tabular digits so columns of rupiah line up.
const figures = [FontFeature.tabularFigures()];

ThemeData monetraTheme() {
  const scheme = ColorScheme.light(
    primary: C.cobalt,
    onPrimary: Colors.white,
    secondary: C.yellow,
    onSecondary: C.ink,
    error: C.red,
    surface: C.paper,
    onSurface: C.ink,
    outline: C.field,
    outlineVariant: C.line,
  );
  final base = ThemeData(useMaterial3: true, colorScheme: scheme, fontFamily: 'Archivo', scaffoldBackgroundColor: C.paper);
  final border = OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: C.field));
  return base.copyWith(
    textTheme: base.textTheme.apply(bodyColor: C.ink, displayColor: C.ink),
    appBarTheme: const AppBarTheme(
      backgroundColor: C.cobalt,
      foregroundColor: Colors.white,
      elevation: 0,
      titleTextStyle: TextStyle(fontFamily: 'Archivo', fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: border,
      enabledBorder: border,
      focusedBorder: border.copyWith(borderSide: const BorderSide(color: C.cobalt, width: 2)),
      errorBorder: border.copyWith(borderSide: const BorderSide(color: C.red)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
        textStyle: const TextStyle(fontFamily: 'Archivo', fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        foregroundColor: C.ink,
        side: const BorderSide(color: C.ink),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
        textStyle: const TextStyle(fontFamily: 'Archivo', fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
    dividerTheme: const DividerThemeData(color: C.line, space: 1, thickness: 1),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: C.cobaltSoft,
      labelTextStyle: WidgetStateProperty.all(const TextStyle(fontFamily: 'Archivo', fontSize: 12, fontWeight: FontWeight.w600)),
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(backgroundColor: C.yellow, foregroundColor: C.ink),
  );
}
