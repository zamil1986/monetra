import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../screens/auth.dart';
import '../screens/categories.dart';
import '../screens/dashboard.dart';
import '../screens/settings.dart';
import '../screens/shell.dart';
import '../screens/transaction_form.dart';
import '../screens/transactions.dart';
import '../screens/wallets.dart';
import 'providers.dart';

const _public = ['/login', '/register', '/forgot-password'];

final routerProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final session = ref.read(sessionProvider);
      final path = state.matchedLocation;
      if (session == Session.loading) return null;
      // needsSignIn keeps the app usable offline; only a Perangkat with no Akun at all goes to sign-in.
      if (session == Session.signedOut && !_public.contains(path)) return '/login';
      if (session == Session.signedIn && _public.contains(path)) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, _) => const RegisterScreen()),
      GoRoute(path: '/forgot-password', builder: (_, _) => const ForgotPasswordScreen()),
      GoRoute(path: '/transactions/new', builder: (_, _) => const TransactionFormScreen()),
      GoRoute(path: '/transactions/:id', builder: (_, s) => TransactionFormScreen(id: s.pathParameters['id'])),
      GoRoute(path: '/categories', builder: (_, _) => const CategoriesScreen()),
      StatefulShellRoute.indexedStack(
        builder: (_, _, shell) => Shell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [GoRoute(path: '/', builder: (_, _) => const DashboardScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/transactions', builder: (_, _) => const TransactionsScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/wallets', builder: (_, _) => const WalletsScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/more', builder: (_, _) => const SettingsScreen())]),
        ],
      ),
    ],
  );
  ref.listen(sessionProvider, (_, _) => router.refresh());
  return router;
});
