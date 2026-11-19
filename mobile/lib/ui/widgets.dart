import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../app/providers.dart';
import '../data/sync.dart';
import '../domain/money.dart';
import '../domain/types.dart';
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
    final color = !colored ? C.ink : value < 0 ? C.red : (signed && value > 0 ? C.green : C.ink);
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
      TransactionType.income => ('+', C.green),
      TransactionType.expense => ('−', C.ink),
      TransactionType.transfer => ('', C.ink2),
    };
    return Text('$sign${formatRupiah(amount)}',
        style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: color, fontFeatures: figures));
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
    final c = color == null ? C.ink2 : hue(color);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color == null ? C.panel : c.withValues(alpha: 0.12), shape: BoxShape.circle),
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
              if (note != null) Text(note!, style: const TextStyle(fontSize: 13, color: C.ink2)),
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
      NoticeTone.info => (C.cobaltSoft, C.cobaltDeep, LucideIcons.info),
      NoticeTone.warn => (C.amberSoft, C.amber, LucideIcons.circleAlert),
      NoticeTone.danger => (C.redSoft, C.red, LucideIcons.circleAlert),
    };
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 18, color: fg),
        const SizedBox(width: 10),
        Expanded(child: Text(text, style: TextStyle(color: C.ink, fontSize: 14))),
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
    if (session == Session.needsSignIn) {
      return Notice('Sign in again to sync. Everything you record stays on this phone meanwhile.',
          tone: NoticeTone.warn, action: TextButton(onPressed: () => context.push('/login'), child: const Text('Sign in')));
    }
    if (state == SyncState.offline) {
      return Notice(
          pending > 0
              ? "You're offline. $pending ${pending == 1 ? 'change waits' : 'changes wait'} on this phone and will sync when you're back online."
              : "You're offline. You can keep recording; it syncs when you're back online.",
          tone: NoticeTone.info);
    }
    if (state == SyncState.failed && pending > 0) {
      return Notice("Couldn't sync $pending ${pending == 1 ? 'change' : 'changes'}. It will try again.", tone: NoticeTone.warn);
    }
    return const SizedBox.shrink();
  }
}

/// Shows a domain refusal or any other message at the bottom of the screen.
void showMessage(BuildContext context, String message) =>
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));

const pad = EdgeInsets.symmetric(horizontal: 16);
