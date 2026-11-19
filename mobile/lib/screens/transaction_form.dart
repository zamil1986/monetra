import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../app/providers.dart';
import '../data/database.dart';
import '../data/ledger.dart';
import '../domain/local_time.dart';
import '../domain/money.dart';
import '../domain/result.dart';
import '../domain/transaction_rules.dart';
import '../domain/types.dart';
import '../ui/icons.dart';
import '../ui/theme.dart';
import '../ui/widgets.dart';

/// Add or edit a Transaksi (PRD 3.4). Saved on the phone at once; the sync follows.
class TransactionFormScreen extends ConsumerWidget {
  const TransactionFormScreen({super.key, this.id});
  final String? id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ledger = ref.watch(ledgerProvider);
    return ledger.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, _) => Scaffold(body: Notice('$e', tone: NoticeTone.danger)),
      data: (l) {
        final existing = id == null ? null : l.transactions.where((t) => t.id == id).firstOrNull;
        if (id != null && existing == null) {
          return Scaffold(appBar: AppBar(), body: const Notice('This transaction was deleted.', tone: NoticeTone.warn));
        }
        return _Form(ledger: l, existing: existing);
      },
    );
  }
}

class _Form extends ConsumerStatefulWidget {
  const _Form({required this.ledger, required this.existing});
  final Ledger ledger;
  final TransactionRow? existing;
  @override
  ConsumerState<_Form> createState() => _FormState();
}

class _FormState extends ConsumerState<_Form> {
  late TransactionType type;
  final amount = TextEditingController();
  final description = TextEditingController();
  String? walletId;
  String? toWalletId;
  String? categoryId;
  late String date;
  late String time;
  Map<String, String> errors = {};
  bool busy = false;

  Ledger get l => widget.ledger;
  bool get editing => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final t = widget.existing;
    final when = instantToLocal(t?.occurredAt ?? DateTime.now(), l.timezone);
    date = when.date;
    time = when.time;
    if (t != null) {
      type = transactionTypeFrom(t.type);
      amount.text = groupDigits(t.amount);
      description.text = t.description ?? '';
      walletId = t.walletId;
      toWalletId = t.toWalletId;
      categoryId = t.categoryId;
    } else {
      type = TransactionType.expense;
      walletId = l.activeWallets.firstOrNull?.id;
    }
  }

  @override
  void dispose() {
    amount.dispose();
    description.dispose();
    super.dispose();
  }

  /// Active wallets, plus an archived one this Transaksi already has (it may stay).
  List<WalletRow> get walletChoices => l.wallets
      .where((w) => w.archivedAt == null || w.id == widget.existing?.walletId || w.id == widget.existing?.toWalletId)
      .toList();

  List<CategoryRow> get categoryChoices {
    if (type == TransactionType.transfer) return [];
    final wanted = type == TransactionType.income ? CategoryType.income : CategoryType.expense;
    return l.categoriesOf(wanted, includeArchived: true)
        .where((c) => c.archivedAt == null || c.id == widget.existing?.categoryId)
        .toList();
  }

  Future<void> save() async {
    final parsed = parseRupiah(amount.text);
    final occurredAt = localToInstant(date, time, l.timezone);
    final local = <String, String>{
      if (parsed is Err<int>) 'amount': parsed.error.message,
      if (occurredAt == null) 'occurredAt': 'Enter a date and time.',
      if (walletId == null) 'walletId': 'Choose one of your wallets.',
    };
    if (local.isNotEmpty) return setState(() => errors = local);
    setState(() => busy = true);
    final result = await ref.read(repositoryProvider).saveTransaction(
          TransactionDraft(
            type: type,
            amount: (parsed as Ok<int>).value,
            walletId: walletId!,
            toWalletId: type == TransactionType.transfer ? toWalletId : null,
            categoryId: type == TransactionType.transfer ? null : categoryId,
            description: description.text,
            occurredAt: occurredAt!,
          ),
          id: widget.existing?.id,
        );
    if (!mounted) return;
    setState(() => busy = false);
    switch (result) {
      case Ok():
        context.pop();
      case Err(:final error):
        setState(() => errors = {error.field ?? 'form': error.message});
    }
  }

  Future<void> delete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Delete this transaction?'),
        content: const Text("It disappears from every list and from the balances, on all your devices. This can't be undone."),
        actions: [
          TextButton(onPressed: () => c.pop(false), child: const Text('Keep it')),
          TextButton(onPressed: () => c.pop(true), style: TextButton.styleFrom(foregroundColor: C.red), child: const Text('Delete')),
        ],
      ),
    );
    if (ok != true) return;
    await ref.read(repositoryProvider).deleteTransaction(widget.existing!.id);
    if (mounted) context.pop();
  }

  Future<void> pickDate() async {
    final current = DateTime.parse(date);
    final picked = await showDatePicker(context: context, initialDate: current, firstDate: DateTime(2000), lastDate: DateTime.now());
    if (picked != null) {
      setState(() => date = '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}');
    }
  }

  Future<void> pickTime() async {
    final parts = time.split(':').map(int.parse).toList();
    final picked = await showTimePicker(context: context, initialTime: TimeOfDay(hour: parts[0], minute: parts[1]));
    if (picked != null) setState(() => time = '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}');
  }

  Widget label(String text) => Padding(padding: const EdgeInsets.only(top: 16, bottom: 6), child: Text(text, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)));
  Widget? errorFor(String field) => errors[field] == null ? null : Padding(padding: const EdgeInsets.only(top: 4), child: Text(errors[field]!, style: const TextStyle(color: C.red, fontSize: 13)));

  @override
  Widget build(BuildContext context) {
    final wasTransfer = widget.existing?.type == 'TRANSFER';
    return Scaffold(
      appBar: AppBar(
        title: Text(editing ? 'Edit transaction' : 'Add transaction'),
        actions: [if (editing) IconButton(onPressed: delete, icon: const Icon(Icons.delete_outline), tooltip: 'Delete')],
      ),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 120), children: [
        label('Type'),
        SegmentedButton<TransactionType>(
          segments: [
            ButtonSegment(value: TransactionType.expense, label: const Text('Expense'), enabled: !editing || !wasTransfer),
            ButtonSegment(value: TransactionType.income, label: const Text('Income'), enabled: !editing || !wasTransfer),
            ButtonSegment(value: TransactionType.transfer, label: const Text('Transfer'), enabled: !editing || wasTransfer),
          ],
          selected: {type},
          onSelectionChanged: (s) => setState(() {
            type = s.first;
            categoryId = null; // a Kategori belongs to one type
          }),
        ),
        if (editing) Padding(padding: const EdgeInsets.only(top: 4), child: Text(wasTransfer ? "A transfer can't change type." : "Income and expense can swap; a transfer can't.", style: const TextStyle(fontSize: 13, color: C.ink2))),
        label('Amount (Rp)'),
        TextField(
          controller: amount,
          keyboardType: TextInputType.number,
          autofocus: !editing,
          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700, fontFeatures: figures),
          decoration: const InputDecoration(hintText: '0'),
          onChanged: (v) {
            final p = parseRupiah(v);
            if (p is Ok<int> && p.value >= 0) {
              final g = groupDigits(p.value);
              if (g != v) amount.value = TextEditingValue(text: g, selection: TextSelection.collapsed(offset: g.length));
            }
          },
        ),
        ?errorFor('amount'),
        label(type == TransactionType.transfer ? 'From wallet' : 'Wallet'),
        _choose<String>(walletId, [for (final w in walletChoices) (w.id, w.name, Glyph(walletIcon(w.icon), color: w.color, size: 28))], (v) => setState(() => walletId = v)),
        ?errorFor('walletId'),
        if (type == TransactionType.transfer) ...[
          label('To wallet'),
          _choose<String>(toWalletId, [for (final w in walletChoices.where((w) => w.id != walletId)) (w.id, w.name, Glyph(walletIcon(w.icon), color: w.color, size: 28))], (v) => setState(() => toWalletId = v)),
          ?errorFor('toWalletId'),
        ] else ...[
          label('Category'),
          _choose<String>(categoryId, [for (final c in categoryChoices) (c.id, c.name, Glyph(categoryIcon(c.icon), color: c.color, size: 28))], (v) => setState(() => categoryId = v)),
          ?errorFor('categoryId'),
        ],
        label('When'),
        Row(children: [
          Expanded(child: OutlinedButton(onPressed: pickDate, child: Text(date))),
          const SizedBox(width: 8),
          Expanded(child: OutlinedButton(onPressed: pickTime, child: Text(time))),
        ]),
        ?errorFor('occurredAt'),
        label('Description (optional)'),
        TextField(controller: description, maxLength: maxDescription, textCapitalization: TextCapitalization.sentences),
        ?errorFor('description'),
        ?errorFor('form'),
        ?errorFor('type'),
      ]),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton(onPressed: busy ? null : save, child: Text(editing ? 'Save changes' : 'Save transaction')),
        ),
      ),
    );
  }

  Widget _choose<T>(T? value, List<(T, String, Widget)> items, ValueChanged<T?> onChanged) => DropdownButtonFormField<T>(
        initialValue: items.any((i) => i.$1 == value) ? value : null,
        isExpanded: true,
        hint: const Text('Choose'),
        items: [for (final i in items) DropdownMenuItem(value: i.$1, child: Row(children: [i.$3, const SizedBox(width: 10), Flexible(child: Text(i.$2, overflow: TextOverflow.ellipsis))]))],
        onChanged: onChanged,
      );
}
