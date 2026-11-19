import 'package:timezone/timezone.dart' as tz;

import 'local_time.dart';
import 'types.dart';

/// Mirrors src/domain/period.ts.
enum PeriodKind { today, week, month, year, custom }

class Period {
  const Period(this.kind, {this.from, this.to});
  final PeriodKind kind;
  final String? from;
  final String? to;
}

String _ymd(int y, int m, int d) => '$y-${m.toString().padLeft(2, '0')}-${d.toString().padLeft(2, '0')}';

/// The local dates a Periode covers, both inclusive, in the profile time zone.
/// A week runs Monday to Sunday.
({String from, String to}) periodDates(Period period, DateTime now, String timeZone) {
  if (period.kind == PeriodKind.custom) return (from: period.from!, to: period.to!);
  final z = tz.TZDateTime.from(now, tz.getLocation(timeZone));
  final today = _ymd(z.year, z.month, z.day);
  switch (period.kind) {
    case PeriodKind.today:
      return (from: today, to: today);
    case PeriodKind.year:
      return (from: _ymd(z.year, 1, 1), to: _ymd(z.year, 12, 31));
    case PeriodKind.month:
      final lastDay = DateTime.utc(z.year, z.month + 1, 0).day;
      return (from: _ymd(z.year, z.month, 1), to: _ymd(z.year, z.month, lastDay));
    case PeriodKind.week:
      // Calendar arithmetic in UTC, which has no DST. DateTime.weekday: Monday = 1.
      final base = DateTime.utc(z.year, z.month, z.day);
      final monday = base.subtract(Duration(days: z.weekday - 1));
      final sunday = monday.add(const Duration(days: 6));
      return (from: _ymd(monday.year, monday.month, monday.day), to: _ymd(sunday.year, sunday.month, sunday.day));
    case PeriodKind.custom:
      throw StateError('unreachable');
  }
}

/// The Periode as [start, endExclusive) instants, for filtering Waktu transaksi.
({String from, String to, DateTime start, DateTime endExclusive}) periodRange(Period period, DateTime now, String timeZone) {
  final d = periodDates(period, now, timeZone);
  final r = localDayRange(d.from, d.to, timeZone);
  return (from: d.from, to: d.to, start: r.start, endExclusive: r.endExclusive);
}

/// Total Income, total Expense, and Net Cash Flow; Transfer counts in none.
({int income, int expense, int net}) cashFlow(Iterable<({TransactionType type, int amount})> movements) {
  var income = 0, expense = 0;
  for (final m in movements) {
    if (m.type == TransactionType.income) income += m.amount;
    if (m.type == TransactionType.expense) expense += m.amount;
  }
  return (income: income, expense: expense, net: income - expense);
}
