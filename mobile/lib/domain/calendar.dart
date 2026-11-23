import 'local_time.dart';
import 'types.dart';

/// The spending calendar: one month of local days, Monday first, with what was spent and received on
/// each. Mirrors src/domain/calendar.ts; both are held to shared/fixtures/domain.json (`calendar`).

String _pad(int n) => n.toString().padLeft(2, '0');

/// "2026-11-20" → "2026-11"
String monthOf(String date) => date.substring(0, 7);

int _daysIn(String month) {
  final y = int.parse(month.substring(0, 4));
  final m = int.parse(month.substring(5, 7));
  return DateTime.utc(y, m + 1, 0).day;
}

/// First and last local date of a "YYYY-MM" month.
({String first, String last}) monthBounds(String month) => (first: '$month-01', last: '$month-${_pad(_daysIn(month))}');

/// The month [delta] months away: shiftMonth("2026-01", -1) is "2025-12".
String shiftMonth(String month, int delta) {
  final d = DateTime.utc(int.parse(month.substring(0, 4)), int.parse(month.substring(5, 7)) + delta, 1);
  return '${d.year}-${_pad(d.month)}';
}

/// The month as rows of seven, Monday first; null pads the days before the 1st and after the last.
List<String?> monthGrid(String month) {
  final first = DateTime.utc(int.parse(month.substring(0, 4)), int.parse(month.substring(5, 7)), 1);
  final lead = first.weekday - 1; // DateTime.monday is 1
  final cells = <String?>[for (var i = 0; i < lead; i++) null];
  for (var d = 1; d <= _daysIn(month); d++) {
    cells.add('$month-${_pad(d)}');
  }
  while (cells.length % 7 != 0) {
    cells.add(null);
  }
  return cells;
}

class DayTotals {
  DayTotals();
  int expense = 0;
  int income = 0;
  int count = 0;
}

/// Expense and Income per local day. A Transfer counts as a transaction on its day but moves neither total.
Map<String, DayTotals> bucketByDay(Iterable<({TransactionType type, int amount, DateTime occurredAt})> movements, String timeZone) {
  final days = <String, DayTotals>{};
  for (final m in movements) {
    final day = days.putIfAbsent(instantToLocal(m.occurredAt, timeZone).date, DayTotals.new);
    day.count += 1;
    if (m.type == TransactionType.expense) day.expense += m.amount;
    if (m.type == TransactionType.income) day.income += m.amount;
  }
  return days;
}

/// The amount a full-width bar stands for: a little above the 85th-percentile spending day,
/// so one rent day draws a full bar without flattening every ordinary day next to it.
double barCap(Iterable<int> values) {
  final spent = values.where((v) => v > 0).toList()..sort();
  if (spent.isEmpty) return 1;
  final i = (spent.length * 0.85).floor();
  return spent[i < spent.length - 1 ? i : spent.length - 1] * 1.15;
}

/// Bar width in percent, at least 2 so a small day still shows a mark.
int barWidth(int value, double cap) => value <= 0 ? 0 : ((value / cap) * 100).round().clamp(2, 100);

/// A short amount for a narrow day cell: "18K", "1.25M" in English, "18rb", "1,25jt" in Indonesian.
String compactRupiah(int value, String lang) {
  final n = value.abs();
  final sign = value < 0 ? '−' : '';
  final thousands = (n / 1000).round();
  if (n < 1000) return '$sign$n';
  if (thousands < 1000) return '$sign$thousands${lang == 'id' ? 'rb' : 'K'}';
  final (unit, size) = n >= 999995000 ? (lang == 'id' ? 'M' : 'B', 1e9) : (lang == 'id' ? 'jt' : 'M', 1e6);
  // As JavaScript's Number((x).toFixed(2)) prints it: no trailing zeros, no trailing dot.
  final figure = (n / size).toStringAsFixed(2).replaceFirst(RegExp(r'\.?0+$'), '');
  return '$sign${lang == 'id' ? figure.replaceFirst('.', ',') : figure}$unit';
}
