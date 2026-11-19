import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../app/providers.dart';
import '../data/database.dart';
import '../data/ledger.dart';
import '../domain/money.dart';
import '../domain/palette.dart';
import '../domain/result.dart';
import '../ui/icons.dart';
import '../ui/theme.dart';
import '../ui/widgets.dart';

/// Dompet (PRD 3.3): Saldo of each, archive at Rp 0, delete only when never used.
class WalletsScreen extends ConsumerWidget {
  const WalletsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ledger = ref.watch(ledgerProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Wallets')),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'wallet',
        onPressed: () => showWalletSheet(context, ref, null),
        icon: const Icon(Icons.add),
        label: const Text('Add wallet'),
      ),
      body: ledger.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Notice('$e', tone: NoticeTone.danger),
        data: (l) => ListView(padding: const EdgeInsets.only(bottom: 96), children: [
          const SyncBanner(),
          const SectionTitle('Total balance', note: 'Active wallets only'),
          Padding(padding: pad, child: Money(l.total, size: 32, weight: FontWeight.w700)),
          const SectionTitle('Active'),
          for (final w in l.activeWallets) _WalletTile(w, l),
          if (l.wallets.any((w) => w.archivedAt != null)) ...[
            const SectionTitle('Archived', note: 'Kept in history and reports; not offered for new transactions'),
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
    Future<void> act(Future<Result<void>> Function() f) async {
      final r = await f();
      if (r is Err<void> && context.mounted) showMessage(context, r.error.message);
    }

    return ListTile(
      leading: Glyph(walletIcon(w.icon), color: w.color),
      title: Text(w.name, style: TextStyle(fontWeight: FontWeight.w600, color: archived ? C.ink3 : C.ink)),
      subtitle: Text('${walletIconData[w.icon]?.$2 ?? ''} · $uses ${uses == 1 ? 'transaction' : 'transactions'}', style: const TextStyle(fontSize: 13, color: C.ink2)),
      trailing: Row(mainAxisSize: MainAxisSize.min, children: [
        Money(l.balances[w.id] ?? 0),
        PopupMenuButton<String>(
          onSelected: (v) => switch (v) {
            'edit' => showWalletSheet(context, ref, w),
            'archive' => act(() => ref.read(repositoryProvider).setWalletArchived(w.id, true)),
            'unarchive' => act(() => ref.read(repositoryProvider).setWalletArchived(w.id, false)),
            'delete' => act(() => ref.read(repositoryProvider).deleteWallet(w.id)),
            _ => null,
          },
          itemBuilder: (_) => [
            if (!archived) const PopupMenuItem(value: 'edit', child: Text('Edit')),
            PopupMenuItem(value: archived ? 'unarchive' : 'archive', child: Text(archived ? 'Unarchive' : 'Archive')),
            if (uses == 0) const PopupMenuItem(value: 'delete', child: Text('Delete')),
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
    if (amount is Err<int>) return setState(() => error = amount.error.message);
    final r = await ref.read(repositoryProvider).saveWallet(
        (name: name.text, openingBalance: (amount as Ok<int>).value, color: color, icon: icon), id: widget.w?.id);
    if (!mounted) return;
    if (r is Err<String>) return setState(() => error = r.error.message);
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + MediaQuery.viewInsetsOf(context).bottom),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(widget.w == null ? 'Add wallet' : 'Edit wallet', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          TextField(controller: name, decoration: const InputDecoration(labelText: 'Name'), maxLength: 40, textCapitalization: TextCapitalization.words),
          TextField(controller: opening, decoration: const InputDecoration(labelText: 'Opening balance (Rp)', helperText: 'May be negative, for example a credit card.'), keyboardType: const TextInputType.numberWithOptions(signed: true)),
          const SizedBox(height: 12),
          Wrap(spacing: 8, children: [
            for (final MapEntry(key: k, value: v) in walletIconData.entries)
              ChoiceChip(avatar: Icon(v.$1, size: 18), label: Text(v.$2), selected: icon == k, onSelected: (_) => setState(() => icon = k)),
          ]),
          const SizedBox(height: 12),
          ColorPicker(value: color, onChanged: (c) => setState(() => color = c)),
          if (error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(error!, style: const TextStyle(color: C.red))),
          const SizedBox(height: 16),
          FilledButton(onPressed: save, child: const Text('Save')),
        ]),
      );
}

class ColorPicker extends StatelessWidget {
  const ColorPicker({super.key, required this.value, required this.onChanged});
  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) => Wrap(spacing: 10, runSpacing: 10, children: [
        for (final c in colors)
          Semantics(
            label: c,
            selected: c == value,
            button: true,
            child: InkWell(
              onTap: () => onChanged(c),
              customBorder: const CircleBorder(),
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(color: hue(c), shape: BoxShape.circle, border: Border.all(color: c == value ? C.ink : Colors.transparent, width: 3)),
                child: c == value ? const Icon(Icons.check, color: Colors.white, size: 18) : null,
              ),
            ),
          ),
      ]);
}
