import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../ui/l10n.dart';
import '../ui/theme.dart';

/// Bottom tabs, with Add in the middle as on the web's phone layout (src/components/tabbar.tsx):
/// a 2px ink rule on top, the active tab in cobalt with its mark on the rule, Add raised in yellow.
/// Recording comes first, so Add sits where the right thumb rests.
class Shell extends StatelessWidget {
  const Shell({super.key, required this.shell});
  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    void go(int i) => shell.goBranch(i, initialLocation: i == shell.currentIndex);
    return Scaffold(
      body: shell,
      bottomNavigationBar: _TabBar(children: [
        _Tab(icon: LucideIcons.house, label: t('nav.home'), active: shell.currentIndex == 0, onTap: () => go(0)),
        _Tab(icon: LucideIcons.receiptText, label: t('nav.transactions'), active: shell.currentIndex == 1, onTap: () => go(1)),
        _AddTab(label: t('nav.add'), semanticLabel: t('nav.addTransaction'), onTap: () => context.push('/transactions/new')),
        _Tab(icon: LucideIcons.wallet, label: t('nav.wallets'), active: shell.currentIndex == 2, onTap: () => go(2)),
        _Tab(icon: LucideIcons.ellipsis, label: t('m.nav.more'), active: shell.currentIndex == 3, onTap: () => go(3)),
      ]),
    );
  }
}

class _TabBar extends StatelessWidget {
  const _TabBar({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => DecoratedBox(
        decoration: BoxDecoration(color: context.c.paper, border: Border(top: BorderSide(color: context.c.ink, width: 2))),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 60,
            child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [for (final c in children) Expanded(child: c)]),
          ),
        ),
      );
}

class _Tab extends StatelessWidget {
  const _Tab({required this.icon, required this.label, required this.active, required this.onTap});
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = active ? context.c.cobaltInk : context.c.ink2;
    return Semantics(
      selected: active,
      button: true,
      label: label,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        child: Stack(children: [
          // The active mark sits on the ink rule, as on the web.
          Align(
            alignment: Alignment.topCenter,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              curve: Curves.easeOutExpo,
              width: active ? 40 : 0,
              height: 3,
              decoration: BoxDecoration(color: context.c.cobaltInk, borderRadius: const BorderRadius.vertical(bottom: Radius.circular(2))),
            ),
          ),
          Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Icon(icon, size: 22, color: color),
              const SizedBox(height: 3),
              Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: color)),
            ]),
          ),
        ]),
      ),
    );
  }
}

class _AddTab extends StatelessWidget {
  const _AddTab({required this.label, required this.semanticLabel, required this.onTap});
  final String label;
  final String semanticLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: semanticLabel,
        excludeSemantics: true,
        child: Tooltip(
          message: semanticLabel,
          child: InkWell(
            onTap: onTap,
            child: Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                // Raised above the rule; the label stays on the same line as its neighbours'.
                Transform.translate(
                  offset: const Offset(0, -10),
                  child: Container(
                    width: 52,
                    height: 40,
                    decoration: BoxDecoration(color: C.yellow, border: Border.all(color: C.onYellow, width: 2), borderRadius: BorderRadius.circular(12)),
                    child: const Icon(LucideIcons.plus, size: 22, color: C.onYellow),
                  ),
                ),
                Transform.translate(
                  offset: const Offset(0, -7),
                  child: Text(label, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: context.c.ink)),
                ),
              ]),
            ),
          ),
        ),
      );
}
