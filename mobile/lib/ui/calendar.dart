import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../data/ledger.dart';
import '../domain/calendar.dart';
import '../domain/local_time.dart';
import '../domain/money.dart';
import '../domain/types.dart';
import '../screens/transactions.dart';
import 'format.dart';
import 'l10n.dart';
import 'theme.dart';
import 'widgets.dart';

/// Weekday headers, Monday first: 2026-11-02 is a Monday.
const _week = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'];

/// The spending calendar, Monetra's signature (src/components/spending-calendar.tsx): the month as a
/// wall-calendar sheet, one cell per day with what was spent, today in yellow, then the chosen day's
/// Transaksi. Computed from the phone's own records, so it works offline (ADR 0005).
class SpendingCalendar extends StatefulWidget {
  const SpendingCalendar(this.l, {super.key});
  final Ledger l;

  @override
  State<SpendingCalendar> createState() => _SpendingCalendarState();
}

class _SpendingCalendarState extends State<SpendingCalendar> {
  late final String today = instantToLocal(DateTime.now(), widget.l.timezone).date;
  late String month = monthOf(today);
  late String? day = today;

  void showMonth(String next) => setState(() {
        month = next;
        day = monthOf(today) == next ? today : null;
      });

  @override
  Widget build(BuildContext context) {
    final l = widget.l;
    final t = context.t;
    final c = context.c;
    final bounds = monthBounds(month);
    final inMonth = l.transactions.where((tx) {
      final d = instantToLocal(tx.occurredAt, l.timezone).date;
      return d.compareTo(bounds.first) >= 0 && d.compareTo(bounds.last) <= 0;
    });
    final days = bucketByDay(inMonth.map((tx) => (type: transactionTypeFrom(tx.type), amount: tx.amount, occurredAt: tx.occurredAt)), l.timezone);
    final spent = days.values.fold<int>(0, (sum, d) => sum + d.expense);
    MapEntry<String, DayTotals>? biggest;
    for (final e in days.entries) {
      if (e.value.expense > 0 && (biggest == null || e.value.expense > biggest.value.expense)) biggest = e;
    }
    final cap = barCap(days.values.map((d) => d.expense));
    final monthName = '${monthLong(bounds.first, t)} ${month.substring(0, 4)}';
    final isCurrent = month == monthOf(today);
    final bold = TextStyle(fontWeight: FontWeight.w700, color: c.ink);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 28, 16, 0),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Expanded(
            child: Semantics(header: true, child: Text(monthName.toUpperCase(), style: fig(28, color: c.ink, weight: 900, height: 1))),
          ),
          _Arrow(icon: LucideIcons.chevronLeft, label: t('cal.prev'), onTap: () => showMonth(shiftMonth(month, -1))),
          const SizedBox(width: 6),
          _Arrow(icon: LucideIcons.chevronRight, label: t('cal.next'), onTap: isCurrent ? null : () => showMonth(shiftMonth(month, 1))),
        ]),
        const SizedBox(height: 6),
        Text.rich(
          spent == 0
              ? TextSpan(text: t('cal.noSpending', {'month': monthName}))
              : TextSpan(children: [
                  ...richSpans(t('cal.spent', {'amount': formatRupiah(spent), 'month': monthLong(bounds.first, t)}), bold),
                  if (biggest != null) ...[
                    const TextSpan(text: ' · '),
                    ...richSpans(t('cal.biggest', {'day': '${weekday(biggest.key, t)} ${dayMonth(biggest.key, t)}', 'amount': formatRupiah(biggest.value.expense)}), bold),
                  ],
                ]),
          style: TextStyle(fontSize: 13, color: c.ink2),
        ),
        const SizedBox(height: 12),
        _Sheet(month: month, today: today, day: day, days: days, cap: cap, onPick: (d) => setState(() => day = d)),
        const SizedBox(height: 10),
        ExcludeSemantics(
          child: Wrap(spacing: 16, runSpacing: 6, children: [
            Row(mainAxisSize: MainAxisSize.min, children: [
              Container(width: 14, height: 4, color: c.ink),
              const SizedBox(width: 6),
              Flexible(child: Text(t('cal.keyBar'), style: TextStyle(fontSize: 13, color: c.ink2))),
            ]),
            Row(mainAxisSize: MainAxisSize.min, children: [
              Text('+', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: c.green)),
              const SizedBox(width: 6),
              Flexible(child: Text(t('cal.keyIn'), style: TextStyle(fontSize: 13, color: c.ink2))),
            ]),
          ]),
        ),
        if (day != null) _DayList(l: l, day: day!, totals: days[day!]),
      ]),
    );
  }
}

class _Arrow extends StatelessWidget {
  const _Arrow({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final enabled = onTap != null;
    return Semantics(
      button: true,
      enabled: enabled,
      label: label,
      excludeSemantics: true,
      child: Material(
        color: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4), side: BorderSide(color: enabled ? c.ink : c.line)),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: SizedBox(width: 44, height: 44, child: Icon(icon, size: 20, color: enabled ? c.ink : c.ink3)),
        ),
      ),
    );
  }
}

class _Sheet extends StatelessWidget {
  const _Sheet({required this.month, required this.today, required this.day, required this.days, required this.cap, required this.onPick});
  final String month;
  final String today;
  final String? day;
  final Map<String, DayTotals> days;
  final double cap;
  final ValueChanged<String> onPick;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final t = context.t;
    final grid = monthGrid(month);
    final hair = BorderSide(color: c.line);
    Widget cell(Widget child, {Color? fill}) => DecoratedBox(
          decoration: BoxDecoration(color: fill, border: Border(right: hair, bottom: hair)),
          child: child,
        );

    return DecoratedBox(
      // The sheet is closed by a 2px ink rule on top, hairlines everywhere else.
      decoration: BoxDecoration(border: Border(top: BorderSide(color: c.ink, width: 2), left: hair)),
      child: Column(children: [
        Row(children: [
          for (final d in _week)
            Expanded(
              child: ExcludeSemantics(
                child: cell(Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                  child: Text(weekday(d, t), style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: c.ink2)),
                )),
              ),
            ),
        ]),
        for (var row = 0; row < grid.length; row += 7)
          Row(children: [
            for (final date in grid.sublist(row, row + 7))
              Expanded(
                child: SizedBox(
                  height: 56,
                  child: date == null
                      ? cell(const SizedBox.expand(), fill: c.panel)
                      : cell(_Day(date: date, today: today, selected: date == day, totals: days[date], cap: cap, onPick: onPick)),
                ),
              ),
          ]),
      ]),
    );
  }
}

class _Day extends StatelessWidget {
  const _Day({required this.date, required this.today, required this.selected, required this.totals, required this.cap, required this.onPick});
  final String date;
  final String today;
  final bool selected;
  final DayTotals? totals;
  final double cap;
  final ValueChanged<String> onPick;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final t = context.t;
    final n = int.parse(date.substring(8));
    if (date.compareTo(today) > 0) {
      return ExcludeSemantics(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(5, 4, 5, 5),
          child: Text('$n', style: fig(19, color: c.ink3, weight: 500, height: 1)),
        ),
      );
    }
    final expense = totals?.expense ?? 0;
    final came = (totals?.income ?? 0) > 0;
    final isToday = date == today;
    // Today is yellow in both Themes, so what sits on it uses the fixed on-yellow ink.
    final ink = isToday ? C.onYellow : c.ink;
    final soft = isToday ? C.onYellow : c.ink2;
    final label = [
      t('cal.cell', {'date': '${weekday(date, t)} ${dayMonth(date, t)}', 'amount': formatRupiah(expense)}),
      if (came) t('cal.cellIn'),
      if (isToday) t('period.today'),
    ].join(', ');

    return Semantics(
      button: true,
      selected: selected,
      label: label,
      excludeSemantics: true,
      child: Material(
        color: isToday ? C.yellow : Colors.transparent,
        child: InkWell(
          onTap: () => onPick(date),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 160),
            curve: Curves.easeOutExpo,
            decoration: BoxDecoration(border: selected ? Border.all(color: ink, width: 2) : null),
            padding: EdgeInsets.fromLTRB(selected ? 3 : 5, selected ? 2 : 4, selected ? 3 : 5, selected ? 3 : 5),
            child: Stack(children: [
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('$n', style: fig(19, color: ink, weight: 900, height: 1)),
                const Spacer(),
                Text(expense == 0 ? '–' : compactRupiah(expense, t.lang),
                    maxLines: 1, overflow: TextOverflow.clip, style: fig(11, color: soft, weight: 700, height: 1.1)),
                if (expense > 0)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: FractionallySizedBox(
                      widthFactor: barWidth(expense, cap) / 100,
                      alignment: Alignment.centerLeft,
                      child: Container(height: 4, color: ink),
                    ),
                  ),
              ]),
              if (came)
                Positioned(top: -2, right: 0, child: Text('+', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: isToday ? C.onYellow : c.green))),
            ]),
          ),
        ),
      ),
    );
  }
}

/// The chosen day under the sheet: its totals, then each Transaksi, oldest first.
class _DayList extends StatelessWidget {
  const _DayList({required this.l, required this.day, required this.totals});
  final Ledger l;
  final String day;
  final DayTotals? totals;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final t = context.t;
    final items = l.transactions.where((tx) => instantToLocal(tx.occurredAt, l.timezone).date == day).toList().reversed.toList();
    final bold = TextStyle(fontWeight: FontWeight.w700, color: c.ink);
    return Padding(
      padding: const EdgeInsets.only(top: 22),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Container(
          padding: const EdgeInsets.only(bottom: 8),
          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.ink, width: 2))),
          child: Row(crossAxisAlignment: CrossAxisAlignment.baseline, textBaseline: TextBaseline.alphabetic, children: [
            Text('${weekday(day, t)} ${dayMonth(day, t)}'.toUpperCase(), style: fig(20, color: c.ink, weight: 900)),
            const SizedBox(width: 10),
            Expanded(
              child: Text.rich(
                TextSpan(children: [
                  if ((totals?.expense ?? 0) > 0) ...richSpans(t('cal.daySpent', {'amount': formatRupiah(totals!.expense)}), bold),
                  if ((totals?.expense ?? 0) > 0 && (totals?.income ?? 0) > 0) const TextSpan(text: ' · '),
                  if ((totals?.income ?? 0) > 0) ...richSpans(t('cal.dayIn', {'amount': formatRupiah(totals!.income)}), bold),
                ]),
                style: TextStyle(fontSize: 13, color: c.ink2),
              ),
            ),
          ]),
        ),
        if (items.isEmpty)
          Padding(padding: const EdgeInsets.symmetric(vertical: 14), child: Text(t('cal.nothingOnDay'), style: TextStyle(color: c.ink2)))
        else
          for (final tx in items) TransactionTile(tx, l, showDay: false, padding: EdgeInsets.zero),
      ]),
    );
  }
}
