import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../app/providers.dart';
import '../data/database.dart';
import '../data/ledger.dart';
import '../domain/local_time.dart';
import '../domain/money.dart';
import '../domain/types.dart';
import '../ui/format.dart';
import '../ui/l10n.dart';
import '../ui/icons.dart';
import '../ui/theme.dart';
import '../ui/widgets.dart';

class TransactionTile extends StatelessWidget {
  const TransactionTile(this.t, this.l, {super.key, this.showDay = true});
  final TransactionRow t;
  final Ledger l;
  final bool showDay;

  @override
  Widget build(BuildContext context) {
    final type = transactionTypeFrom(t.type);
    final category = l.category(t.categoryId);
    final where = type == TransactionType.transfer
        ? '${l.wallet(t.walletId)?.name} → ${l.wallet(t.toWalletId)?.name}'
        : l.wallet(t.walletId)?.name ?? '';
    final local = instantToLocal(t.occurredAt, l.timezone);
    final s = context.t;
    final when = showDay ? whenShort(t.occurredAt, l.timezone, s) : local.time;
    return ListTile(
      leading: Glyph(categoryIcon(category?.icon), color: category?.color),
      title: Text(l.titleOf(t, s), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text('${category?.name ?? s('type.TRANSFER')} · $where · $when', maxLines: 1, overflow: TextOverflow.ellipsis,
          style: TextStyle(fontSize: 13, color: context.c.ink2)),
      trailing: TransactionAmount(type, t.amount),
      onTap: () => context.push('/transactions/${t.id}'),
    );
  }
}

/// Riwayat Transaksi (PRD 3.5): grouped by local day, searchable, filterable by type and Dompet.
class TransactionsScreen extends ConsumerStatefulWidget {
  const TransactionsScreen({super.key});
  @override
  ConsumerState<TransactionsScreen> createState() => _TransactionsState();
}

class _TransactionsState extends ConsumerState<TransactionsScreen> {
  String search = '';
  TransactionType? type;
  String? walletId;

  @override
  Widget build(BuildContext context) {
    final ledger = ref.watch(ledgerProvider);
    final s = context.t;
    return Scaffold(
      appBar: AppBar(title: Text(s('nav.transactions'))),
      body: ledger.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ReadError(e),
        data: (l) {
          final q = search.trim().toLowerCase();
          final rows = l.transactions.where((t) {
            if (type != null && t.type != wire(type!)) return false;
            if (walletId != null && t.walletId != walletId && t.toWalletId != walletId) return false;
            if (q.isNotEmpty && !(t.description ?? '').toLowerCase().contains(q)) return false;
            return true;
          }).toList();
          final days = <String, List<TransactionRow>>{};
          for (final t in rows) {
            days.putIfAbsent(instantToLocal(t.occurredAt, l.timezone).date, () => []).add(t);
          }
          return RefreshIndicator(
            onRefresh: () => ref.read(syncSchedulerProvider).now(),
            child: ListView(padding: const EdgeInsets.only(bottom: 96), children: [
              const SyncBanner(),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: TextField(
                  decoration: InputDecoration(hintText: s('filters.search'), prefixIcon: const Icon(Icons.search)),
                  onChanged: (v) => setState(() => search = v),
                ),
              ),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(children: [
                  for (final (t, label) in [
                    (null, s('m.all')),
                    (TransactionType.income, s('type.INCOME')),
                    (TransactionType.expense, s('type.EXPENSE')),
                    (TransactionType.transfer, s('type.TRANSFER')),
                  ])
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(label: Text(label), selected: type == t, onSelected: (_) => setState(() => type = t)),
                    ),
                  const SizedBox(width: 8),
                  DropdownButton<String?>(
                    value: walletId,
                    hint: Text(s('filters.allWallets')),
                    underline: const SizedBox.shrink(),
                    items: [
                      DropdownMenuItem(value: null, child: Text(s('filters.allWallets'))),
                      for (final w in l.wallets) DropdownMenuItem(value: w.id, child: Text(w.name)),
                    ],
                    onChanged: (v) => setState(() => walletId = v),
                  ),
                ]),
              ),
              if (rows.isEmpty)
                Notice(l.transactions.isEmpty ? s('m.empty') : s('m.tx.noMatch')),
              for (final MapEntry(key: day, value: list) in days.entries) ...[
                Container(
                  color: context.c.panel,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: Text(
                    '${weekday(day, s)}, ${dayMonth(day, s)} · '
                    '${s('day.spent', {'amount': formatRupiah(list.where((t) => t.type == 'EXPENSE').fold(0, (sum, t) => sum + t.amount))})}',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                ),
                for (final t in list) TransactionTile(t, l, showDay: false),
              ],
            ]),
          );
        },
      ),
    );
  }
}
