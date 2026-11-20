import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../app/providers.dart';
import '../data/database.dart';
import '../data/ledger.dart';
import '../domain/category_rules.dart';
import '../domain/result.dart';
import '../domain/types.dart';
import '../ui/icons.dart';
import '../ui/l10n.dart';
import '../ui/theme.dart';
import '../ui/widgets.dart';
import 'wallets.dart' show ColorPicker;

/// Kategori (PRD 3.6): Income and Expense kept apart; Transfer never has one.
class CategoriesScreen extends ConsumerWidget {
  const CategoriesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ledger = ref.watch(ledgerProvider);
    final t = context.t;
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text(t('nav.categories')),
          bottom: TabBar(
              labelColor: Colors.white,
              unselectedLabelColor: C.onCobalt,
              indicatorColor: C.yellow,
              tabs: [Tab(text: t('type.EXPENSE')), Tab(text: t('type.INCOME'))]),
        ),
        body: ledger.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Notice('$e', tone: NoticeTone.danger),
          data: (l) => TabBarView(children: [_List(l, CategoryType.expense), _List(l, CategoryType.income)]),
        ),
      ),
    );
  }
}

class _List extends ConsumerWidget {
  const _List(this.l, this.type);
  final Ledger l;
  final CategoryType type;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final all = l.categoriesOf(type, includeArchived: true);
    final t = context.t;
    Future<void> act(Future<Result<void>> Function() f) async {
      final r = await f();
      if (r is Err<void> && context.mounted) showMessage(context, r.error.text(context.t));
    }

    Widget tile(CategoryRow c) {
      final archived = c.archivedAt != null;
      final uses = l.usesOfCategory(c.id);
      return ListTile(
        leading: Glyph(categoryIcon(c.icon), color: c.color),
        title: Text(c.name, style: TextStyle(fontWeight: FontWeight.w600, color: archived ? C.ink3 : C.ink)),
        subtitle: Text(t('tx.count', {'count': uses}), style: const TextStyle(fontSize: 13, color: C.ink2)),
        trailing: PopupMenuButton<String>(
          onSelected: (v) => switch (v) {
            'edit' => showCategorySheet(context, type, c),
            'archive' => act(() => ref.read(repositoryProvider).setCategoryArchived(c.id, true)),
            'unarchive' => act(() => ref.read(repositoryProvider).setCategoryArchived(c.id, false)),
            'delete' => act(() => ref.read(repositoryProvider).deleteCategory(c.id)),
            _ => null,
          },
          itemBuilder: (_) => [
            PopupMenuItem(value: 'edit', child: Text(t('m.edit'))),
            PopupMenuItem(value: archived ? 'unarchive' : 'archive', child: Text(archived ? t('common.unarchive') : t('m.archive'))),
            if (uses == 0) PopupMenuItem(value: 'delete', child: Text(t('del.button'))),
          ],
        ),
      );
    }

    return ListView(padding: const EdgeInsets.only(bottom: 96), children: [
      const SyncBanner(),
      for (final c in all.where((c) => c.archivedAt == null)) tile(c),
      if (all.any((c) => c.archivedAt != null)) ...[
        SectionTitle(t('common.archived')),
        for (final c in all.where((c) => c.archivedAt != null)) tile(c),
      ],
      Padding(
        padding: const EdgeInsets.all(16),
        child: OutlinedButton.icon(
          onPressed: () => showCategorySheet(context, type, null),
          icon: const Icon(Icons.add),
          label: Text(t(type == CategoryType.income ? 'm.categories.addINCOME' : 'm.categories.addEXPENSE')),
        ),
      ),
    ]);
  }
}

Future<void> showCategorySheet(BuildContext context, CategoryType type, CategoryRow? c) =>
    showModalBottomSheet(context: context, isScrollControlled: true, builder: (_) => _CategoryForm(type, c));

class _CategoryForm extends ConsumerStatefulWidget {
  const _CategoryForm(this.type, this.c);
  final CategoryType type;
  final CategoryRow? c;
  @override
  ConsumerState<_CategoryForm> createState() => _CategoryFormState();
}

class _CategoryFormState extends ConsumerState<_CategoryForm> {
  late final name = TextEditingController(text: widget.c?.name);
  late String icon = widget.c?.icon ?? (widget.type == CategoryType.income ? 'coins' : 'receipt');
  late String color = widget.c?.color ?? 'teal';
  String? error;

  Future<void> save() async {
    final r = await ref.read(repositoryProvider).saveCategory((name: name.text, icon: icon, color: color), widget.type, id: widget.c?.id);
    if (!mounted) return;
    if (r is Err<String>) return setState(() => error = r.error.text(context.t));
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    return Padding(
        padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + MediaQuery.viewInsetsOf(context).bottom),
        child: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(widget.c == null ? t('m.categories.add') : t('m.categories.edit'), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            TextField(controller: name, decoration: InputDecoration(labelText: t('common.name')), maxLength: maxCategoryName, textCapitalization: TextCapitalization.sentences),
            const SizedBox(height: 8),
            Wrap(spacing: 4, runSpacing: 4, children: [
              for (final MapEntry(key: k, value: v) in categoryIconData.entries)
                IconButton(
                  tooltip: k,
                  isSelected: icon == k,
                  style: IconButton.styleFrom(backgroundColor: icon == k ? hue(color).withValues(alpha: 0.15) : null),
                  onPressed: () => setState(() => icon = k),
                  icon: Icon(v, color: icon == k ? hue(color) : C.ink2),
                ),
            ]),
            const SizedBox(height: 12),
            ColorPicker(value: color, onChanged: (c) => setState(() => color = c)),
            if (error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(error!, style: const TextStyle(color: C.red))),
            const SizedBox(height: 16),
            FilledButton(onPressed: save, child: Text(t('m.save'))),
          ]),
        ),
      );
  }
}
