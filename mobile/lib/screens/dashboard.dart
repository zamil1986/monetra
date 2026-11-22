import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart' show StateProvider;
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../app/providers.dart';
import '../data/ledger.dart';
import '../domain/period.dart';
import '../ui/calendar.dart';
import '../ui/format.dart';
import '../ui/l10n.dart';
import '../domain/money.dart';
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
      // The wordmark as the web sets it: condensed, heavy, with the yellow full stop.
      appBar: AppBar(
        title: Semantics(
          label: 'Monetra',
          excludeSemantics: true,
          child: Text.rich(TextSpan(text: 'MONETRA', style: fig(26, color: Colors.white, weight: 900), children: [
            TextSpan(text: '.', style: fig(26, color: C.yellow, weight: 900)),
          ])),
        ),
      ),
      body: ledger.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ReadError(e),
        data: (l) => RefreshIndicator(
          onRefresh: () => ref.read(syncSchedulerProvider).now(),
          child: ListView(padding: const EdgeInsets.only(bottom: 96), children: [
            const SyncBanner(),
            _TotalBalance(l),
            // The signature, right under the money: which days cost what (web: src/components/spending-calendar.tsx).
            SpendingCalendar(l),
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
  Widget build(BuildContext context) {
    final c = context.c;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(context.t('dash.totalBalance'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        Text(context.t('dash.totalBalanceSub'), style: TextStyle(fontSize: 13, color: c.ink2)),
        const SizedBox(height: 6),
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(formatRupiah(l.total), style: fig(48, color: l.total < 0 ? c.red : c.ink, weight: 900, height: 1.05)),
        ),
        const SizedBox(height: 14),
        // Each Dompet in its own hue, on hairline rows closed by the 2px ink rule.
        DecoratedBox(
          decoration: BoxDecoration(border: Border(top: BorderSide(color: c.ink, width: 2))),
          child: Column(children: [
            for (final w in l.activeWallets)
              InkWell(
                onTap: () => context.go('/wallets'),
                child: Container(
                  constraints: const BoxConstraints(minHeight: 48),
                  decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.line))),
                  child: Row(children: [
                    Container(width: 12, height: 12, decoration: BoxDecoration(color: c.hue(w.color), borderRadius: BorderRadius.circular(2))),
                    const SizedBox(width: 10),
                    Expanded(child: Text(w.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600))),
                    Money(l.balances[w.id] ?? 0),
                  ]),
                ),
              ),
          ]),
        ),
      ]),
    );
  }
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
    final c = context.c;
    final most = [f.income, f.expense, 1].reduce((a, b) => a > b ? a : b);
    // Income green, Expense ink: red stays for overspending and negatives only.
    Widget bar(IconData icon, String label, int amount, Color tone) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              Icon(icon, size: 20, color: tone == c.green ? c.green : c.ink),
              const SizedBox(width: 10),
              Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600))),
              Money(amount, colored: false),
            ]),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(2),
              child: Container(
                height: 8,
                color: c.panel,
                alignment: Alignment.centerLeft,
                child: FractionallySizedBox(widthFactor: amount == 0 ? 0 : (amount / most).clamp(0.01, 1.0), child: Container(color: tone)),
              ),
            ),
          ]),
        );
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SectionTitle(t(_labels[period.kind]!), note: t('dash.flowSub', {'range': rangeLabel(f.from, f.to, t)})),
      Padding(
        padding: pad,
        child: Wrap(spacing: 8, runSpacing: 8, children: [
          for (final k in PeriodKind.values)
            ChoicePill(
              label: t(_labels[k]!),
              selected: period.kind == k,
              onTap: () => k == PeriodKind.custom ? pickRange(context, ref) : ref.read(periodProvider.notifier).state = Period(k),
            ),
        ]),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
        child: DecoratedBox(
          decoration: BoxDecoration(border: Border(top: BorderSide(color: c.ink, width: 2))),
          child: Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Column(children: [
              bar(LucideIcons.arrowDownLeft, t('type.INCOME'), f.income, c.green),
              bar(LucideIcons.arrowUpRight, t('type.EXPENSE'), f.expense, c.ink),
              Container(
                constraints: const BoxConstraints(minHeight: 48),
                decoration: BoxDecoration(border: Border(top: BorderSide(color: c.line))),
                child: Row(children: [
                  Icon(LucideIcons.equal, size: 20, color: c.ink),
                  const SizedBox(width: 10),
                  Expanded(child: Text(t('dash.netCashFlow'), style: const TextStyle(fontWeight: FontWeight.w600))),
                  Money(f.net, signed: true),
                ]),
              ),
            ]),
          ),
        ),
      ),
    ]);
  }
}
