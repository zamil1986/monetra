// The same cases run in src/domain/shared-fixtures.test.ts (ADR 0005): the phone computes
// Saldo and Periode offline, so both implementations must agree with this file exactly.
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:monetra/domain/balance.dart';
import 'package:monetra/domain/category_rules.dart';
import 'package:monetra/domain/money.dart';
import 'package:monetra/domain/period.dart';
import 'package:monetra/domain/result.dart';
import 'package:monetra/domain/types.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;

void main() {
  tzdata.initializeTimeZones();
  final fixture = jsonDecode(File('../shared/fixtures/domain.json').readAsStringSync()) as Map<String, dynamic>;
  List<Map<String, dynamic>> list(Object? o) => (o as List).cast<Map<String, dynamic>>();

  Movement movement(Map<String, dynamic> m) => Movement(
      type: transactionTypeFrom(m['type'] as String),
      amount: m['amount'] as int,
      walletId: (m['walletId'] ?? '') as String,
      toWalletId: m['toWalletId'] as String?);

  group('Saldo and Total Balance', () {
    for (final c in list(fixture['balances'])) {
      test(c['name'], () {
        final wallets = list(c['wallets'])
            .map((w) => WalletState(id: w['id'] as String, openingBalance: w['openingBalance'] as int, archived: w['archived'] as bool))
            .toList();
        final movements = list(c['movements']).map(movement).toList();
        final expected = c['expected'] as Map<String, dynamic>;
        expect(balancesByWallet(wallets, movements), (expected['byWallet'] as Map).cast<String, int>());
        expect(totalBalance(wallets, movements), expected['total']);
      });
    }
  });

  group('Net Cash Flow', () {
    for (final c in list(fixture['cashFlow'])) {
      test(c['name'], () {
        final r = cashFlow(list(c['movements']).map((m) => (type: transactionTypeFrom(m['type'] as String), amount: m['amount'] as int)));
        final e = c['expected'] as Map<String, dynamic>;
        expect((r.income, r.expense, r.net), (e['income'], e['expense'], e['net']));
      });
    }
  });

  group('Periode', () {
    for (final c in list(fixture['periods'])) {
      test(c['name'], () {
        final p = c['period'] as Map<String, dynamic>;
        final period = Period(PeriodKind.values.byName(p['kind'] as String), from: p['from'] as String?, to: p['to'] as String?);
        final r = periodRange(period, DateTime.parse(c['now'] as String), c['timeZone'] as String);
        final e = c['expected'] as Map<String, dynamic>;
        expect(r.from, e['from']);
        expect(r.to, e['to']);
        expect(r.start, DateTime.parse(e['start'] as String));
        expect(r.endExclusive, DateTime.parse(e['endExclusive'] as String));
      });
    }
  });

  group('Rupiah', () {
    final rupiah = fixture['rupiah'] as Map<String, dynamic>;
    for (final pair in (rupiah['format'] as List).cast<List>()) {
      test('formats ${pair[0]} as ${pair[1]}', () => expect(formatRupiah(pair[0] as int), pair[1]));
    }
    for (final pair in (rupiah['parse'] as List).cast<List>()) {
      test('reads "${pair[0]}" as ${pair[1]}', () {
        final r = parseRupiah(pair[0] as String);
        expect(r is Ok<int> ? r.value : null, pair[1]);
      });
    }
    for (final c in (rupiah['keepTyped'] as List).cast<List>()) {
      test('keeps "${c[0]}" (minus allowed: ${c[1]}) as "${c[2]}"', () {
        expect(keepAmountTyping(c[0] as String, allowMinus: c[1] as bool), c[2]);
      });
    }
  });

  group('Kategori names', () {
    final clash = fixture['categoryNameClash'] as Map<String, dynamic>;
    final existing = list(clash['existing'])
        .map((c) => ExistingCategory(
            id: c['id'] as String, name: c['name'] as String, type: categoryTypeFrom(c['type'] as String), archived: c['archived'] as bool))
        .toList();
    for (final c in list(clash['cases'])) {
      test(c['name'], () {
        final hit = findNameClash(c['input'] as String, categoryTypeFrom(c['type'] as String), existing, c['selfId'] as String?);
        expect(hit?.id, c['clashId']);
      });
    }
  });
}
