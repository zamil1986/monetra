import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart' show StateProvider;
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../app/providers.dart';
import '../data/ledger.dart';
import '../domain/period.dart';
import '../ui/format.dart';
import '../ui/theme.dart';
import '../ui/widgets.dart';
import 'transactions.dart';

const _labels = {
  PeriodKind.today: 'Today', PeriodKind.week: 'This week', PeriodKind.month: 'This month',
  PeriodKind.year: 'This year', PeriodKind.custom: 'Custom',
};

final periodProvider = StateProvider<Period>((ref) => const Period(PeriodKind.month));

/// PRD 3.2, Phase 1, computed on the phone from local data so it works offline (ADR 0005).
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ledger = ref.watch(ledgerProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Monetra')),
      body: ledger.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Notice('Couldn\'t read this phone\'s data: $e', tone: NoticeTone.danger),
        data: (l) => RefreshIndicator(
          onRefresh: () => ref.read(syncSchedulerProvider).now(),
          child: ListView(padding: const EdgeInsets.only(bottom: 96), children: [
            const SyncBanner(),
            _TotalBalance(l),
            _CashFlow(l),
            SectionTitle('Recent transactions', trailing: TextButton(onPressed: () => context.go('/transactions'), child: const Text('View all'))),
            if (l.transactions.isEmpty)
              const Notice('Nothing recorded yet. Tap + to record your first transaction.')
            else
              for (final t in l.transactions.take(5)) TransactionTile(t, l),
          ]),
        ),
      ),
    );
  }
}

class _TotalBalance extends StatelessWidget {
  const _TotalBalance(this.l);
  final Ledger l;

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SectionTitle('Total balance', note: "Current position. The period doesn't change it."),
        Padding(padding: pad, child: Money(l.total, size: 40, weight: FontWeight.w700)),
        const SizedBox(height: 8),
        for (final w in l.activeWallets)
          ListTile(
            dense: true,
            leading: Container(width: 10, height: 10, decoration: BoxDecoration(color: hue(w.color), shape: BoxShape.circle)),
            minLeadingWidth: 10,
            title: Text(w.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            trailing: Money(l.balances[w.id] ?? 0),
            onTap: () => context.go('/wallets'),
          ),
      ]);
}

class _CashFlow extends ConsumerWidget {
  const _CashFlow(this.l);
  final Ledger l;

  Future<void> pickRange(BuildContext context, WidgetRef ref) async {
    final range = await showDateRangePicker(context: context, firstDate: DateTime(2000), lastDate: DateTime.now().add(const Duration(days: 1)));
    if (range == null) return;
    String ymd(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
    ref.read(periodProvider.notifier).state = Period(PeriodKind.custom, from: ymd(range.start), to: ymd(range.end));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final period = ref.watch(periodProvider);
    final f = l.flow(period, DateTime.now());
    Widget row(IconData icon, String label, Widget value, [Color? iconColor]) => ListTile(
        leading: Icon(icon, color: iconColor ?? C.ink), title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)), trailing: value);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SectionTitle(_labels[period.kind]!, note: '${rangeLabel(f.from, f.to)} · transfers not counted'),
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: pad,
        child: Row(children: [
          for (final k in PeriodKind.values)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(_labels[k]!),
                selected: period.kind == k,
                onSelected: (_) => k == PeriodKind.custom ? pickRange(context, ref) : ref.read(periodProvider.notifier).state = Period(k),
              ),
            ),
        ]),
      ),
      row(LucideIcons.arrowDownLeft, 'Income', Money(f.income, colored: false), C.green),
      row(LucideIcons.arrowUpRight, 'Expense', Money(f.expense, colored: false)),
      row(LucideIcons.equal, 'Net cash flow', Money(f.net, signed: true)),
    ]);
  }
}
