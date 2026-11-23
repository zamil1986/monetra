import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

/// The fixed tokens: the cobalt band, yellow, and the ink that sits on yellow. Same in both Themes.
abstract final class C {
  static const cobalt = Color(0xFF1B3FAB);
  static const cobaltDeep = Color(0xFF142F86);
  static const onCobalt = Color(0xFFCFD9FA);
  static const yellow = Color(0xFFFFD83A);
  static const onYellow = Color(0xFF14161A);
}

/// The tokens that flip with the Theme, from src/app/globals.css (`light-dark(<light>, <dark>)`), so the
/// phone and the web read as one product. Read them with `context.c`. The dark set is the same wall
/// calendar in a dark room: paper goes dark, ink goes light, the cobalt band and yellow stay.
@immutable
class MonetraColors extends ThemeExtension<MonetraColors> {
  const MonetraColors({
    required this.paper,
    required this.panel,
    required this.surface,
    required this.line,
    required this.field,
    required this.ink,
    required this.ink2,
    required this.ink3,
    required this.cobaltInk,
    required this.cobaltSoft,
    required this.cobaltText,
    required this.red,
    required this.redSoft,
    required this.green,
    required this.greenSoft,
    required this.amber,
    required this.amberSoft,
    required this.hues,
  });

  final Color paper, panel, surface, line, field, ink, ink2, ink3;
  /// Cobalt as text, link and focus on paper; the band itself stays [C.cobalt].
  final Color cobaltInk, cobaltSoft, cobaltText;
  final Color red, redSoft, green, greenSoft, amber, amberSoft;
  /// Hues a Dompet or Kategori can wear (src/domain/palette.ts); each holds a white glyph.
  final Map<String, Color> hues;

  Color hue(String? name) => hues[name] ?? hues['slate']!;

  static const light = MonetraColors(
    paper: Color(0xFFFBFCFD),
    panel: Color(0xFFF1F4F8),
    surface: Color(0xFFFFFFFF),
    line: Color(0xFFD9DEE6),
    field: Color(0xFF7B8491),
    ink: Color(0xFF14161A),
    ink2: Color(0xFF454D59),
    ink3: Color(0xFF656D79),
    cobaltInk: Color(0xFF1B3FAB),
    cobaltSoft: Color(0xFFE7ECFA),
    cobaltText: Color(0xFF12265F),
    red: Color(0xFFD0261C),
    redSoft: Color(0xFFFDECEA),
    green: Color(0xFF0B7343),
    greenSoft: Color(0xFFE4F3EA),
    amber: Color(0xFF8F5400),
    amberSoft: Color(0xFFFFF1CC),
    hues: {
      'green': Color(0xFF0B7343),
      'blue': Color(0xFF2A5BD7),
      'teal': Color(0xFF0B8C8C),
      'olive': Color(0xFF5E7A12),
      'orange': Color(0xFFC95F12),
      'violet': Color(0xFF7A3FC4),
      'magenta': Color(0xFFB8296F),
      'slate': Color(0xFF48566A),
      'brown': Color(0xFF8A5A2B),
    },
  );

  static const dark = MonetraColors(
    paper: Color(0xFF0F1115),
    panel: Color(0xFF181B21),
    surface: Color(0xFF1C2027),
    line: Color(0xFF2C323C),
    field: Color(0xFF6B7482),
    ink: Color(0xFFE9ECF1),
    ink2: Color(0xFFB3BAC5),
    ink3: Color(0xFF949CA9),
    cobaltInk: Color(0xFF8FA8FF),
    cobaltSoft: Color(0xFF1A2447),
    cobaltText: Color(0xFFC9D5FF),
    red: Color(0xFFFF6B5E),
    redSoft: Color(0xFF3A1714),
    green: Color(0xFF4CC38A),
    greenSoft: Color(0xFF10291D),
    amber: Color(0xFFF0B54A),
    amberSoft: Color(0xFF33260A),
    hues: {
      'green': Color(0xFF17895A),
      'blue': Color(0xFF3D6BE6),
      'teal': Color(0xFF0F9696),
      'olive': Color(0xFF6A8A16),
      'orange': Color(0xFFCF6A1C),
      'violet': Color(0xFF8A52D6),
      'magenta': Color(0xFFC43A7E),
      'slate': Color(0xFF5D6B80),
      'brown': Color(0xFF9A6935),
    },
  );

  @override
  MonetraColors copyWith() => this;

  /// Theme changes snap rather than tween: the two palettes are separate worlds, not a gradient.
  @override
  MonetraColors lerp(MonetraColors? other, double t) => other == null || t < 0.5 ? this : other;
}

extension MonetraColorsOf on BuildContext {
  MonetraColors get c => Theme.of(this).extension<MonetraColors>() ?? MonetraColors.light;
}

/// The Theme this phone shows (ADR 0007): stored on the Perangkat under `device.theme`, never synced.
const themePrefs = ['system', 'light', 'dark'];

ThemeMode themeModeOf(String? pref) => switch (pref) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };

/// Figures use tabular digits so columns of rupiah line up.
const figures = [FontFeature.tabularFigures()];

/// The calendar numeral voice, as the web's `fig` utility (src/app/globals.css): Archivo condensed to
/// 68% width, heavy, tabular. Every amount and every date number in the app is set in it.
TextStyle fig(double size, {Color? color, double weight = 800, double? height}) => TextStyle(
      fontFamily: 'Archivo',
      fontSize: size,
      // A variable face: the axes carry the voice, fontWeight keeps Flutter's own weight matching in step.
      fontVariations: [const FontVariation('wdth', 68), FontVariation('wght', weight)],
      fontWeight: FontWeight.values[((weight / 100).round() - 1).clamp(0, 8)],
      fontFeatures: figures,
      color: color,
      height: height,
    );

ThemeData monetraTheme(Brightness brightness) {
  final c = brightness == Brightness.dark ? MonetraColors.dark : MonetraColors.light;
  final dark = brightness == Brightness.dark;
  // Material paints `primary` as a foreground too (focused labels, cursor, date and time pickers, progress,
  // chips), so on dark paper it is the lifted cobalt. Filled buttons and the band keep the real cobalt below.
  final scheme = (dark ? const ColorScheme.dark() : const ColorScheme.light()).copyWith(
    primary: c.cobaltInk,
    onPrimary: dark ? c.paper : Colors.white,
    secondary: C.yellow,
    onSecondary: C.onYellow,
    error: c.red,
    surface: c.paper,
    onSurface: c.ink,
    outline: c.field,
    outlineVariant: c.line,
    // Dark only: Material's own dark greys become the palette's. Light keeps the defaults it always had.
    onSurfaceVariant: dark ? c.ink2 : null,
    surfaceContainerLowest: dark ? c.paper : null,
    surfaceContainerLow: dark ? c.panel : null,
    surfaceContainer: dark ? c.panel : null,
    surfaceContainerHigh: dark ? c.surface : null,
    surfaceContainerHighest: dark ? c.surface : null,
    secondaryContainer: dark ? c.cobaltSoft : null,
    onSecondaryContainer: dark ? c.cobaltText : null,
  );
  final base = ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    fontFamily: 'Archivo',
    scaffoldBackgroundColor: c.paper,
    extensions: [c],
  );
  final border = OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: BorderSide(color: c.field));
  return base.copyWith(
    textTheme: base.textTheme.apply(bodyColor: c.ink, displayColor: c.ink),
    // The cobalt band tops every screen in both Themes.
    appBarTheme: const AppBarTheme(
      backgroundColor: C.cobalt,
      foregroundColor: Colors.white,
      elevation: 0,
      titleTextStyle: TextStyle(fontFamily: 'Archivo', fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: c.surface,
      border: border,
      enabledBorder: border,
      focusedBorder: border.copyWith(borderSide: BorderSide(color: c.cobaltInk, width: 2)),
      errorBorder: border.copyWith(borderSide: BorderSide(color: c.red)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: C.cobalt,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
        textStyle: const TextStyle(fontFamily: 'Archivo', fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        foregroundColor: c.ink,
        side: BorderSide(color: c.ink),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
        textStyle: const TextStyle(fontFamily: 'Archivo', fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
    textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(foregroundColor: c.cobaltInk)),
    dividerTheme: DividerThemeData(color: c.line, space: 1, thickness: 1),
    // The back arrow in the same Lucide stroke as every other icon in the app.
    actionIconTheme: ActionIconThemeData(backButtonIconBuilder: (_) => const Icon(LucideIcons.arrowLeft)),
    // Square-cornered like the web's dialogs, closed by the 2px ink top rule (drawn in [ruledDialogShape]).
    dialogTheme: DialogThemeData(
      backgroundColor: c.paper,
      shape: ruledDialogShape(c),
      surfaceTintColor: Colors.transparent,
      titleTextStyle: TextStyle(fontFamily: 'Archivo', fontSize: 20, fontWeight: FontWeight.w700, color: c.ink),
      contentTextStyle: TextStyle(fontFamily: 'Archivo', fontSize: 15, height: 1.45, color: c.ink2),
    ),
    // One choice out of a few, as the web's segClass: ink outline, the chosen segment filled ink.
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: ButtonStyle(
        backgroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? c.ink : Colors.transparent),
        foregroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? c.paper : c.ink2),
        iconColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? c.paper : c.ink2),
        side: WidgetStateProperty.all(BorderSide(color: c.ink)),
        shape: WidgetStateProperty.all(RoundedRectangleBorder(borderRadius: BorderRadius.circular(4))),
        textStyle: WidgetStateProperty.all(const TextStyle(fontFamily: 'Archivo', fontSize: 15, fontWeight: FontWeight.w600)),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: c.ink,
      contentTextStyle: TextStyle(fontFamily: 'Archivo', fontSize: 15, fontWeight: FontWeight.w600, color: c.paper, height: 1.35),
      actionTextColor: c.paper,
      closeIconColor: c.paper,
      behavior: SnackBarBehavior.floating,
      shape: Border(top: BorderSide(color: C.yellow, width: 2)),
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(backgroundColor: C.yellow, foregroundColor: C.onYellow),
  );
}

/// A dialog's outline: square corners, a hairline round it and the 2px ink rule along the top.
ShapeBorder ruledDialogShape(MonetraColors c) =>
    Border(top: BorderSide(color: c.ink, width: 2), left: BorderSide(color: c.line), right: BorderSide(color: c.line), bottom: BorderSide(color: c.line));
