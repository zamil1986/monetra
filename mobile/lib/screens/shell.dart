import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../ui/l10n.dart';

/// Bottom tabs, with Add in the middle as on the web's phone layout. Recording comes first.
class Shell extends StatelessWidget {
  const Shell({super.key, required this.shell});
  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    return Scaffold(
        body: shell,
        floatingActionButton: FloatingActionButton(
          heroTag: 'add',
          tooltip: t('nav.addTransaction'),
          onPressed: () => context.push('/transactions/new'),
          child: const Icon(LucideIcons.plus),
        ),
        floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
        bottomNavigationBar: NavigationBar(
          selectedIndex: shell.currentIndex,
          onDestinationSelected: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
          destinations: [
            NavigationDestination(icon: const Icon(LucideIcons.house), label: t('nav.home')),
            NavigationDestination(icon: const Icon(LucideIcons.receiptText), label: t('nav.transactions')),
            NavigationDestination(icon: const Icon(LucideIcons.wallet), label: t('nav.wallets')),
            NavigationDestination(icon: const Icon(LucideIcons.ellipsis), label: t('m.nav.more')),
          ],
        ),
      );
  }
}
