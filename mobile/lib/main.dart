import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;

import 'app/providers.dart';
import 'app/router.dart';
import 'screens/settings.dart' show checkForUpdate;
import 'ui/theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // Periode boundaries follow the profile time zone, computed on the phone (ADR 0005).
  tzdata.initializeTimeZones();
  runApp(const ProviderScope(child: MonetraApp()));
}

class MonetraApp extends ConsumerStatefulWidget {
  const MonetraApp({super.key});
  @override
  ConsumerState<MonetraApp> createState() => _MonetraAppState();
}

class _MonetraAppState extends ConsumerState<MonetraApp> {
  @override
  Widget build(BuildContext context) {
    ref.watch(syncSchedulerProvider); // starts the sync triggers
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'Monetra',
      theme: monetraTheme(),
      routerConfig: router,
      debugShowCheckedModeBanner: false,
      builder: (context, child) => _UpdateCheck(child: child!),
    );
  }
}

/// Once per launch, quietly: offers a newer APK when the download page has one.
class _UpdateCheck extends ConsumerStatefulWidget {
  const _UpdateCheck({required this.child});
  final Widget child;
  @override
  ConsumerState<_UpdateCheck> createState() => _UpdateCheckState();
}

class _UpdateCheckState extends ConsumerState<_UpdateCheck> {
  bool checked = false;

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    if (!checked && session == Session.signedIn) {
      checked = true;
      final nav = ref.read(routerProvider).routerDelegate.navigatorKey;
      Future.delayed(const Duration(seconds: 3), () async {
        final ctx = nav.currentContext;
        if (ctx != null && ctx.mounted) {
          final info = await PackageInfo.fromPlatform();
          if (ctx.mounted) await checkForUpdate(ctx, ref, info.version);
        }
      });
    }
    return widget.child;
  }

}
