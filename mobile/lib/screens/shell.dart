import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

/// Bottom tabs, with Add in the middle as on the web's phone layout. Recording comes first.
class Shell extends StatelessWidget {
  const Shell({super.key, required this.shell});
  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context) => Scaffold(
        body: shell,
        floatingActionButton: FloatingActionButton(
          heroTag: 'add',
          tooltip: 'Add transaction',
          onPressed: () => context.push('/transactions/new'),
          child: const Icon(LucideIcons.plus),
        ),
        floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
        bottomNavigationBar: NavigationBar(
          selectedIndex: shell.currentIndex,
          onDestinationSelected: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
          destinations: const [
            NavigationDestination(icon: Icon(LucideIcons.house), label: 'Home'),
            NavigationDestination(icon: Icon(LucideIcons.receiptText), label: 'Transactions'),
            NavigationDestination(icon: Icon(LucideIcons.wallet), label: 'Wallets'),
            NavigationDestination(icon: Icon(LucideIcons.ellipsis), label: 'More'),
          ],
        ),
      );
}
