import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../app/providers.dart';
import '../data/sync.dart';
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

/// Shows a domain refusal or any other message at the bottom of the screen.
void showMessage(BuildContext context, String message) =>
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));

const pad = EdgeInsets.symmetric(horizontal: 16);
