import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../app/providers.dart';
import '../data/sync.dart';
import '../domain/i18n.dart';
import '../domain/money.dart';
import '../domain/types.dart';
import 'l10n.dart';
import 'theme.dart';

/// A rupiah figure. Money state never relies on colour alone: the sign is always written.
class Money extends StatelessWidget {
  const Money(this.value, {super.key, this.size = 17, this.weight = FontWeight.w600, this.signed = false, this.colored = true});
  final int value;
  final double size;
  final FontWeight weight;
  /// Shows "+" for positive values (Net Cash Flow).
  final bool signed;
  final bool colored;

  @override
  Widget build(BuildContext context) {
    final text = signed && value > 0 ? '+${formatRupiah(value)}' : formatRupiah(value);
    final color = !colored ? context.c.ink : value < 0 ? context.c.red : (signed && value > 0 ? context.c.green : context.c.ink);
    return Text(text, style: TextStyle(fontSize: size, fontWeight: weight, color: color, fontFeatures: figures));
  }
}

/// The amount of a Transaksi as its type shows it: −Rp for Expense, +Rp for Income, plain for Transfer.
class TransactionAmount extends StatelessWidget {
  const TransactionAmount(this.type, this.amount, {super.key});
  final TransactionType type;
  final int amount;

  @override
  Widget build(BuildContext context) {
    final (sign, color) = switch (type) {
      TransactionType.income => ('+', context.c.green),
      TransactionType.expense => ('−', context.c.ink),
      TransactionType.transfer => ('', context.c.ink2),
    };
    return Text('$sign${formatRupiah(amount)}',
        style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: color, fontFeatures: figures));
  }
}

/// One choice in a wrap of choices, as the web's chips: glyph and name, yellow when chosen (selection).
class ChoicePill extends StatelessWidget {
  const ChoicePill({super.key, required this.label, required this.selected, required this.onTap, this.leading});
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Semantics(
      selected: selected,
      button: true,
      inMutuallyExclusiveGroup: true,
      child: Material(
        color: selected ? C.yellow : c.surface,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(4), side: BorderSide(color: selected ? C.onYellow : c.line, width: selected ? 1.5 : 1)),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 44),
            child: Padding(
              padding: EdgeInsets.fromLTRB(leading == null ? 14 : 6, 6, 14, 6),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                if (leading != null) ...[leading!, const SizedBox(width: 8)],
                Text(label, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: selected ? C.onYellow : c.ink)),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

/// A coloured round icon for a Dompet or Kategori; Transfer gets a plain one.
class Glyph extends StatelessWidget {
  const Glyph(this.icon, {super.key, this.color, this.size = 36});
  final IconData icon;
  final String? color;
  final double size;

  @override
  Widget build(BuildContext context) {
    final c = color == null ? context.c.ink2 : context.c.hue(color);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color == null ? context.c.panel : c.withValues(alpha: 0.12), shape: BoxShape.circle),
      child: Icon(icon, size: size * 0.5, color: c),
    );
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.title, {super.key, this.note, this.trailing});
  final String title;
  final String? note;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
        child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              if (note != null) Text(note!, style: TextStyle(fontSize: 13, color: context.c.ink2)),
            ]),
          ),
          ?trailing,
        ]),
      );
}

/// A message band: info, warning or danger, always with text, never colour alone.
class Notice extends StatelessWidget {
  const Notice(this.text, {super.key, this.tone = NoticeTone.info, this.action});
  final String text;
  final NoticeTone tone;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final (bg, fg, icon) = switch (tone) {
      NoticeTone.info => (context.c.cobaltSoft, context.c.cobaltText, LucideIcons.info),
      NoticeTone.warn => (context.c.amberSoft, context.c.amber, LucideIcons.circleAlert),
      NoticeTone.danger => (context.c.redSoft, context.c.red, LucideIcons.circleAlert),
    };
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 18, color: fg),
        const SizedBox(width: 10),
        Expanded(child: Text(text, style: TextStyle(color: context.c.ink, fontSize: 14))),
        ?action,
      ]),
    );
  }
}

enum NoticeTone { info, warn, danger }

/// Shown above every tab: queued changes, offline, or a session that needs signing in again.
class SyncBanner extends ConsumerWidget {
  const SyncBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final state = ref.watch(syncStateProvider).value ?? SyncState.idle;
    final pending = ref.watch(pendingCountProvider).value ?? 0;
    final t = context.t;
    if (session == Session.needsSignIn) {
      return Notice(t('m.sync.signInAgain'),
          tone: NoticeTone.warn, action: TextButton(onPressed: () => context.push('/login'), child: Text(t('login.submit'))));
    }
    if (state == SyncState.offline) {
      return Notice(pending > 0 ? t('m.sync.offlinePending', {'count': pending}) : t('m.sync.offline'), tone: NoticeTone.info);
    }
    if (state == SyncState.failed && pending > 0) {
      return Notice(t('m.sync.failed', {'count': pending}), tone: NoticeTone.warn);
    }
    return const SizedBox.shrink();
  }
}

/// The phone's own records could not be read. Says what to do in the person's words; the exception
/// itself goes to the log, never onto the screen.
class ReadError extends StatelessWidget {
  const ReadError(this.error, {super.key});
  final Object error;

  @override
  Widget build(BuildContext context) {
    debugPrint('Monetra could not read the ledger: $error');
    return Notice(context.t('m.readError'), tone: NoticeTone.danger);
  }
}

/// What a sync refusal was about, in the person's words: "Wallet", "Category", "Transaction".
String entityLabel(String entity, Strings t) => switch (entity) {
      'wallet' => t('common.wallet'),
      'category' => t('common.category'),
      _ => t('tx.col.transaction'),
    };

/// Deleting always asks first (PRD 3.4 rule 10), naming what goes. True when the person confirmed.
Future<bool> confirmDelete(BuildContext context, {required String title, required String body, required String item, required String confirm}) async {
  final t = context.t;
  final ok = await showDialog<bool>(
    context: context,
    builder: (c) => AlertDialog(
      title: Text(title),
      content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(body),
        const SizedBox(height: 12),
        Text(item, style: const TextStyle(fontWeight: FontWeight.w700)),
      ]),
      actions: [
        TextButton(onPressed: () => c.pop(false), child: Text(t('del.keep'))),
        TextButton(onPressed: () => c.pop(true), style: TextButton.styleFrom(foregroundColor: c.c.red), child: Text(confirm)),
      ],
    ),
  );
  return ok == true;
}

/// Shows a domain refusal or any other message at the bottom of the screen.
void showMessage(BuildContext context, String message) =>
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));

const pad = EdgeInsets.symmetric(horizontal: 16);
