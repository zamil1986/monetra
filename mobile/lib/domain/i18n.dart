import '../i18n/catalog.g.dart';

/// Bahasa: the interface language a Pengguna picks (ADR 0006). Mirrors src/domain/i18n.ts and
/// reads the same catalogs (shared/i18n, copied into catalog.g.dart by tool/gen_i18n.dart).
/// Names the Pengguna owns (Dompet, Kategori) are data and never pass through here.
const langs = ['en', 'id'];
const defaultLang = 'en';

bool isLang(Object? value) => langs.contains(value);

final _placeholder = RegExp(r'\{(\w+)\}');
final _markup = RegExp(r'<(\w+)>(.*?)</\1>');

/// The text for [key] in [lang], with `{name}` placeholders filled in. A key holding a plural pair
/// (`key.one` / `key.other`) picks `.one` when `count` is 1. Unknown keys fall back to English,
/// then to the key itself.
String translate(String lang, String key, [Map<String, Object?>? params]) {
  String? lookup(Map<String, String>? catalog) {
    if (catalog == null) return null;
    final direct = catalog[key];
    if (direct != null) return direct;
    final count = params?['count'];
    if (count is int) return catalog['$key.${count == 1 ? 'one' : 'other'}'];
    return null;
  }

  final text = lookup(catalogs[lang]) ?? lookup(catalogs[defaultLang]) ?? key;
  if (params == null) return text;
  return text.replaceAllMapped(_placeholder, (m) => params.containsKey(m[1]) ? '${params[m[1]]}' : m[0]!);
}

/// Indonesian when the device or browser names it first, otherwise English.
String langFromLocale(String? locale) {
  final first = (locale ?? '').split(',').first.trim().toLowerCase().replaceAll('_', '-');
  return first == 'id' || first.startsWith('id-') || first == 'in' || first.startsWith('in-') ? 'id' : defaultLang;
}

/// A translator bound to one Bahasa: `t('nav.home')`, `t('tx.count', {'count': 3})`.
class Strings {
  const Strings(this.lang);
  final String lang;

  String call(String key, [Map<String, Object?>? params]) => translate(lang, key, params);

  /// The same text without its inline markup (`<b>…</b>`, `<link>…</link>`), for plain Text widgets.
  String plain(String key, [Map<String, Object?>? params]) => call(key, params).replaceAllMapped(_markup, (m) => m[2]!);
}
