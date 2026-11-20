import 'package:flutter/widgets.dart';

import '../domain/i18n.dart';

/// The Bahasa of the screen: `context.t('nav.home')`. Follows the app's locale, which follows the
/// Akun (ADR 0006), and rebuilds the widget when it changes.
extension L10n on BuildContext {
  Strings get t => Strings(Localizations.maybeLocaleOf(this)?.languageCode ?? defaultLang);
}
