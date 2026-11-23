import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../app/providers.dart';
import '../data/database.dart';
import '../data/ledger.dart';
import '../domain/money.dart';
import '../domain/palette.dart';
import '../domain/result.dart';
import '../ui/amount_input.dart';
import '../ui/icons.dart';
import '../ui/l10n.dart';
import '../ui/theme.dart';
import '../ui/widgets.dart';

/// Dompet (PRD 3.3): Saldo of each, archive at Rp 0, delete only when never used.
class WalletsScreen extends ConsumerWidget {
  const WalletsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ledger = ref.watch(ledgerProvider);
    final t = context.t;
    return Scaffold(
      appBar: AppBar(title: Text(t('nav.wallets'))),
      body: ledger.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ReadError(e),
        data: (l) => ListView(padding: const EdgeInsets.only(bottom: 96), children: [
          const SyncBanner(),
          SectionTitle(t('dash.totalBalance'), note: t('m.wallets.activeOnly')),
          Padding(
            padding: pad,
            child: FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(formatRupiah(l.total), style: fig(48, color: l.total < 0 ? context.c.red : context.c.ink, weight: 900, height: 1.05)),
            ),
          ),
          SectionTitle(t('categories.active')),
          for (final w in l.activeWallets) _WalletTile(w, l),
          // One Add on this screen, at the end of the list it adds to; the tab bar's Add is for Transaksi.
          Padding(
            padding: const EdgeInsets.all(16),
            child: OutlinedButton.icon(
              onPressed: () => showWalletSheet(context, ref, null),
              icon: const Icon(LucideIcons.plus),
              label: Text(t('m.wallets.add')),
            ),
          ),
          if (l.wallets.any((w) => w.archivedAt != null)) ...[
            SectionTitle(t('common.archived'), note: t('m.wallets.archivedNote')),
            for (final w in l.wallets.where((w) => w.archivedAt != null)) _WalletTile(w, l),
          ],
        ]),
      ),
    );
  }
}

class _WalletTile extends ConsumerWidget {
  const _WalletTile(this.w, this.l);
  final WalletRow w;
  final Ledger l;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final archived = w.archivedAt != null;
    final uses = l.usesOfWallet(w.id);
    final t = context.t;
    Future<void> act(Future<Result<void>> Function() f) async {
      final r = await f();
      if (r is! Err<void> || !context.mounted) return;
      // A Saldo that blocks the Arsip comes with the two ways to bring it to Rp 0, as on the web.
      showTopAlert(context, r.error.text(context.t), actions: [
        if (r.error.code == 'WALLET_NOT_EMPTY') ...[
          (t('wallets.transferOut'), () => context.push('/transactions/new?type=transfer')),
          (t('wallets.recordExpense'), () => context.push('/transactions/new')),
        ],
      ]);
    }

    return ListTile(
      leading: Glyph(walletIcon(w.icon), color: w.color),
      title: Text(w.name, style: TextStyle(fontWeight: FontWeight.w600, color: archived ? context.c.ink3 : context.c.ink)),
      subtitle: Text('${t('walletIcon.${w.icon}')} · ${t('tx.count', {'count': uses})}', style: TextStyle(fontSize: 13, color: context.c.ink2)),
      trailing: Row(mainAxisSize: MainAxisSize.min, children: [
        Money(l.balances[w.id] ?? 0),
        PopupMenuButton<String>(
          icon: const Icon(LucideIcons.ellipsisVertical),
          onSelected: (v) => switch (v) {
            'edit' => showWalletSheet(context, ref, w),
            'archive' => act(() => ref.read(repositoryProvider).setWalletArchived(w.id, true)),
            'unarchive' => act(() => ref.read(repositoryProvider).setWalletArchived(w.id, false)),
            'delete' => confirmDelete(context, title: t('wallets.del.title'), body: t('wallets.del.body'), item: w.name, confirm: t('wallets.del.confirm'))
                .then((ok) => ok ? act(() => ref.read(repositoryProvider).deleteWallet(w.id)) : null),
            _ => null,
          },
          itemBuilder: (_) => [
            if (!archived) PopupMenuItem(value: 'edit', child: Text(t('m.edit'))),
            PopupMenuItem(value: archived ? 'unarchive' : 'archive', child: Text(archived ? t('common.unarchive') : t('m.archive'))),
            if (uses == 0) PopupMenuItem(value: 'delete', child: Text(t('del.button'))),
          ],
        ),
      ]),
    );
  }
}

Future<void> showWalletSheet(BuildContext context, WidgetRef ref, WalletRow? w) => showModalBottomSheet(
    context: context, isScrollControlled: true, builder: (_) => _WalletForm(w));

class _WalletForm extends ConsumerStatefulWidget {
  const _WalletForm(this.w);
  final WalletRow? w;
  @override
  ConsumerState<_WalletForm> createState() => _WalletFormState();
}

class _WalletFormState extends ConsumerState<_WalletForm> {
  late final name = TextEditingController(text: widget.w?.name);
  late final opening = TextEditingController(text: widget.w == null ? '0' : formatRupiah(widget.w!.openingBalance).replaceFirst('Rp ', ''));
  late String icon = widget.w?.icon ?? 'bank';
  late String color = widget.w?.color ?? 'blue';
  String? error;

  Future<void> save() async {
    final amount = parseRupiah(opening.text);
    if (amount is Err<int>) return setState(() => error = amount.error.text(context.t));
    final r = await ref.read(repositoryProvider).saveWallet(
        (name: name.text, openingBalance: (amount as Ok<int>).value, color: color, icon: icon), id: widget.w?.id);
    if (!mounted) return;
    if (r is Err<String>) return setState(() => error = r.error.text(context.t));
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    return Padding(
        padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + MediaQuery.viewInsetsOf(context).bottom),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(widget.w == null ? t('m.wallets.add') : t('m.wallets.edit'), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          TextField(controller: name, decoration: InputDecoration(labelText: t('common.name')), maxLength: 40, textCapitalization: TextCapitalization.words),
          TextField(
              controller: opening,
              decoration: InputDecoration(labelText: t('m.wallets.openingRp'), helperText: t('m.wallets.openingHelp')),
              keyboardType: const TextInputType.numberWithOptions(signed: true),
              inputFormatters: const [AmountInputFormatter(allowMinus: true, group: true)]),
          const SizedBox(height: 12),
          Wrap(spacing: 8, children: [
            for (final MapEntry(key: k, value: v) in walletIconData.entries)
              ChoiceChip(avatar: Icon(v, size: 18), label: Text(t('walletIcon.$k')), selected: icon == k, onSelected: (_) => setState(() => icon = k)),
          ]),
          const SizedBox(height: 12),
          ColorPicker(value: color, onChanged: (c) => setState(() => color = c)),
          if (error != null) Padding(padding: EdgeInsets.only(top: 12), child: Text(error!, style: TextStyle(color: context.c.red))),
          const SizedBox(height: 16),
          FilledButton(onPressed: save, child: Text(t('m.save'))),
        ]),
      );
  }
}

class ColorPicker extends StatelessWidget {
  const ColorPicker({super.key, required this.value, required this.onChanged});
  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) => Wrap(spacing: 10, runSpacing: 10, children: [
        for (final c in colors)
          Semantics(
            label: context.t('color.$c'),
            selected: c == value,
            button: true,
            child: InkWell(
              onTap: () => onChanged(c),
              customBorder: const CircleBorder(),
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(color: context.c.hue(c), shape: BoxShape.circle, border: Border.all(color: c == value ? context.c.ink : Colors.transparent, width: 3)),
                child: c == value ? const Icon(LucideIcons.check, color: Colors.white, size: 18) : null,
              ),
            ),
          ),
      ]);
}
