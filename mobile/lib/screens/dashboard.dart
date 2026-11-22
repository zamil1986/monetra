import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart' show StateProvider;
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../app/providers.dart';
import '../data/ledger.dart';
import '../domain/period.dart';
import '../ui/format.dart';
import '../ui/l10n.dart';
import '../ui/theme.dart';
import '../ui/widgets.dart';
import 'transactions.dart';

const _labels = {
  PeriodKind.today: 'period.today', PeriodKind.week: 'period.week', PeriodKind.month: 'period.month',
  PeriodKind.year: 'period.year', PeriodKind.custom: 'period.custom',
};

final periodProvider = StateProvider<Period>((ref) => const Period(PeriodKind.month));

/// PRD 3.2, Phase 1, computed on the phone from local data so it works offline (ADR 0005).
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ledger = ref.watch(ledgerProvider);
    final t = context.t;
    return Scaffold(
      appBar: AppBar(title: const Text('Monetra')),
      body: ledger.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ReadError(e),
        data: (l) => RefreshIndicator(
          onRefresh: () => ref.read(syncSchedulerProvider).now(),
          child: ListView(padding: const EdgeInsets.only(bottom: 96), children: [
            const SyncBanner(),
            _TotalBalance(l),
            _CashFlow(l),
            SectionTitle(t('dash.recent'), trailing: TextButton(onPressed: () => context.go('/transactions'), child: Text(t('dash.viewAll')))),
            if (l.transactions.isEmpty)
              Notice(t('m.empty'))
            else
              for (final tx in l.transactions.take(5)) TransactionTile(tx, l),
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
        SectionTitle(context.t('dash.totalBalance'), note: context.t('dash.totalBalanceSub')),
        Padding(padding: pad, child: Money(l.total, size: 40, weight: FontWeight.w700)),
        const SizedBox(height: 8),
        for (final w in l.activeWallets)
          ListTile(
            dense: true,
            leading: Container(width: 10, height: 10, decoration: BoxDecoration(color: context.c.hue(w.color), shape: BoxShape.circle)),
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
    final t = context.t;
    Widget row(IconData icon, String label, Widget value, [Color? iconColor]) => ListTile(
        leading: Icon(icon, color: iconColor ?? context.c.ink), title: Text(label, style: TextStyle(fontWeight: FontWeight.w600)), trailing: value);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SectionTitle(t(_labels[period.kind]!), note: t('dash.flowSub', {'range': rangeLabel(f.from, f.to, t)})),
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: pad,
        child: Row(children: [
          for (final k in PeriodKind.values)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(t(_labels[k]!)),
                selected: period.kind == k,
                onSelected: (_) => k == PeriodKind.custom ? pickRange(context, ref) : ref.read(periodProvider.notifier).state = Period(k),
              ),
            ),
        ]),
      ),
      row(LucideIcons.arrowDownLeft, t('type.INCOME'), Money(f.income, colored: false), context.c.green),
      row(LucideIcons.arrowUpRight, t('type.EXPENSE'), Money(f.expense, colored: false)),
      row(LucideIcons.equal, t('dash.netCashFlow'), Money(f.net, signed: true)),
    ]);
  }
}
