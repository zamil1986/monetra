// The shared catalogs (ADR 0006): the generated copy is current, both Bahasa offer every text
// with the same placeholders, and the phone formats dates like the web (src/domain/i18n.test.ts).
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:monetra/domain/i18n.dart';
import 'package:monetra/domain/result.dart';
import 'package:monetra/domain/transaction_rules.dart';
import 'package:monetra/domain/types.dart';
import 'package:monetra/i18n/catalog.g.dart';
import 'package:monetra/ui/format.dart';

import '../tool/gen_i18n.dart' as gen;

List<String> _placeholders(String s) => RegExp(r'\{(\w+)\}').allMatches(s).map((m) => m[1]!).toList()..sort();

void main() {
  test('catalog.g.dart matches shared/i18n (run: dart run tool/gen_i18n.dart)', () {
    expect(File('lib/i18n/catalog.g.dart').readAsStringSync(), gen.generate(gen.readShared()));
  });

  test('both Bahasa have the same keys and placeholders', () {
    final en = catalogs['en']!;
    final id = catalogs['id']!;
    expect(id.keys.toSet(), en.keys.toSet());
    for (final key in en.keys) {
      expect(_placeholders(id[key]!), _placeholders(en[key]!), reason: key);
    }
  });

  test('translates with placeholders and plural pairs', () {
    const id = Strings('id');
    const en = Strings('en');
    expect(id('tx.transferTo', {'wallet': 'GoPay'}), 'Transfer ke GoPay');
    expect(en('tx.count', {'count': 1}), '1 transaction');
    expect(en('tx.count', {'count': 2}), '2 transactions');
    expect(id.plain('forgot.sent', {'email': 'a@b.c'}), 'Kalau a@b.c punya akun, tautan reset sedang dikirim. Tautannya berlaku satu jam.');
  });

  test('a refusal renders in either Bahasa', () {
    const e = DomainError('WALLET_ARCHIVED', 'error.wallet.archivedEdit', params: {'name': 'OVO'});
    expect(e.message, 'OVO is archived. Unarchive it to make changes.');
    expect(e.text(const Strings('id')), 'OVO diarsip. Keluarkan dari Arsip untuk mengubahnya.');
  });

  test('reads the phone locale like the web reads Accept-Language', () {
    expect(langFromLocale('id-ID'), 'id');
    expect(langFromLocale('id_ID'), 'id');
    expect(langFromLocale('in'), 'id');
    expect(langFromLocale('en-US'), 'en');
    expect(langFromLocale(null), 'en');
  });

  test('dates and titles match the web in Indonesian', () {
    const t = Strings('id');
    expect('${weekday('2026-11-19', t)} ${dayMonth('2026-11-19', t)}', 'Kam 19 Nov');
    expect(dayMonth('2026-08-17', t), '17 Agu');
    expect(monthLong('2026-08-17', t), 'Agustus');
    expect(weekday('2026-11-22', const Strings('en')), 'Sun');
    expect(transactionTitle(type: TransactionType.transfer, toWalletName: 'BCA', t: t), 'Transfer ke BCA');
  });
}
