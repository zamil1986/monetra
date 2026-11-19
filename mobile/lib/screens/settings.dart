import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../app/providers.dart';
import '../data/api.dart';
import '../data/sync.dart';
import '../ui/format.dart';
import '../ui/theme.dart';
import '../ui/widgets.dart';
import 'auth.dart' show authMessage;

const _timezones = {'Asia/Jakarta': 'WIB (Jakarta)', 'Asia/Makassar': 'WITA (Makassar)', 'Asia/Jayapura': 'WIT (Jayapura)'};

final _versionProvider = FutureProvider<String>((ref) async {
  final info = await PackageInfo.fromPlatform();
  return info.version;
});

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = ref.watch(ledgerProvider).value;
    final pending = ref.watch(pendingCountProvider).value ?? 0;
    final failures = ref.watch(syncFailuresProvider).value ?? const [];
    final state = ref.watch(syncStateProvider).value ?? SyncState.idle;
    final lastAt = ref.watch(lastSyncProvider).value;
    final version = ref.watch(_versionProvider).value;

    Future<void> online(Future<void> Function() f, String done) async {
      try {
        await f();
        await ref.read(syncSchedulerProvider).now();
        if (context.mounted) showMessage(context, done);
      } catch (e) {
        if (context.mounted) showMessage(context, isOffline(e) ? 'This needs a connection. Try again when online.' : authMessage(e));
      }
    }

    return Scaffold(
      appBar: AppBar(title: const Text('More')),
      body: ListView(children: [
        const SyncBanner(),
        ListTile(
          leading: const Icon(Icons.person_outline),
          title: Text(l?.profileName ?? '–', style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Text(l?.profileEmail ?? ''),
        ),
        ListTile(
          leading: const Icon(Icons.category_outlined),
          title: const Text('Categories'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('/categories'),
        ),
        ListTile(
          leading: const Icon(Icons.schedule),
          title: const Text('Time zone'),
          subtitle: const Text('Days, weeks and months start by this clock'),
          trailing: DropdownButton<String>(
            value: _timezones.containsKey(l?.timezone) ? l!.timezone : null,
            hint: Text(l?.timezone ?? ''),
            underline: const SizedBox.shrink(),
            items: [for (final MapEntry(key: k, value: v) in _timezones.entries) DropdownMenuItem(value: k, child: Text(v))],
            onChanged: (tz) => tz == null ? null : online(() => ref.read(apiProvider).updateProfile(timezone: tz), 'Time zone saved.'),
          ),
        ),
        ListTile(
          leading: const Icon(Icons.lock_outline),
          title: const Text('Change password'),
          onTap: () => showDialog(context: context, builder: (_) => _ChangePassword(onSubmit: (current, next) => online(() => ref.read(apiProvider).changePassword(current, next), 'Password changed.'))),
        ),
        const Divider(),
        ListTile(
          leading: Icon(state == SyncState.syncing ? Icons.sync : pending > 0 ? Icons.cloud_upload_outlined : Icons.cloud_done_outlined),
          title: Text(state == SyncState.syncing ? 'Syncing…' : pending > 0 ? '$pending ${pending == 1 ? 'change' : 'changes'} not synced yet' : 'Everything is synced'),
          subtitle: Text(lastAt == null ? 'Not synced yet' : 'Last synced ${whenShort(DateTime.parse(lastAt), l?.timezone ?? 'Asia/Jakarta')}'),
          trailing: TextButton(onPressed: () => ref.read(syncSchedulerProvider).now(), child: const Text('Sync now')),
        ),
        if (failures.isNotEmpty) ...[
          Notice("The server refused ${failures.length} ${failures.length == 1 ? 'change' : 'changes'}. Fix the record on this phone and it will sync again.", tone: NoticeTone.warn,
              action: TextButton(onPressed: () => ref.read(repositoryProvider).dismissFailures(), child: const Text('Dismiss'))),
          for (final f in failures) ListTile(dense: true, title: Text(f.message), subtitle: Text('${f.entity} · ${f.code}')),
        ],
        const Divider(),
        ListTile(
          leading: const Icon(Icons.system_update_outlined),
          title: const Text('App version'),
          subtitle: Text(version ?? ''),
          trailing: TextButton(onPressed: () => checkForUpdate(context, ref, version, quiet: false), child: const Text('Check')),
        ),
        ListTile(
          leading: const Icon(Icons.logout, color: C.red),
          title: const Text('Sign out', style: TextStyle(color: C.red)),
          onTap: () => _signOut(context, ref),
        ),
      ]),
    );
  }

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    final session = ref.read(sessionProvider.notifier);
    if (await session.signOut()) return;
    if (!context.mounted) return;
    final discard = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Some changes aren\'t synced'),
        content: const Text("Signing out now removes them from this phone, and they never reach your other devices. Sync first when you're online."),
        actions: [
          TextButton(onPressed: () => c.pop(false), child: const Text('Stay signed in')),
          TextButton(onPressed: () => c.pop(true), style: TextButton.styleFrom(foregroundColor: C.red), child: const Text('Sign out anyway')),
        ],
      ),
    );
    if (discard == true) await session.signOut(discardUnsent: true);
  }
}

class _ChangePassword extends StatefulWidget {
  const _ChangePassword({required this.onSubmit});
  final Future<void> Function(String current, String next) onSubmit;
  @override
  State<_ChangePassword> createState() => _ChangePasswordState();
}

class _ChangePasswordState extends State<_ChangePassword> {
  final current = TextEditingController();
  final next = TextEditingController();

  @override
  Widget build(BuildContext context) => AlertDialog(
        title: const Text('Change password'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: current, obscureText: true, decoration: const InputDecoration(labelText: 'Current password')),
          const SizedBox(height: 12),
          TextField(controller: next, obscureText: true, decoration: const InputDecoration(labelText: 'New password', helperText: 'At least 8 characters.')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: const Size(0, 40)),
            onPressed: () {
              Navigator.pop(context);
              widget.onSubmit(current.text, next.text);
            },
            child: const Text('Save'),
          ),
        ],
      );
}

int _compare(String a, String b) {
  final x = a.split('.').map((p) => int.tryParse(p) ?? 0).toList();
  final y = b.split('.').map((p) => int.tryParse(p) ?? 0).toList();
  for (var i = 0; i < 3; i++) {
    final d = (i < x.length ? x[i] : 0) - (i < y.length ? y[i] : 0);
    if (d != 0) return d;
  }
  return 0;
}

/// Asks the server for the newest APK and offers it. Quiet mode says nothing when up to date or offline.
Future<void> checkForUpdate(BuildContext context, WidgetRef ref, String? current, {bool quiet = true}) async {
  if (current == null) return;
  try {
    final latest = await ref.read(apiProvider).appVersion();
    final version = latest['version'] as String?;
    final url = latest['apkUrl'] as String?;
    if (!context.mounted) return;
    if (version == null || url == null || _compare(version, current) <= 0) {
      if (!quiet) showMessage(context, "You're on the latest version.");
      return;
    }
    final go = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text('Monetra $version is available'),
        content: Text('You have $current. The download opens in your browser; install it over this one and your data stays.'),
        actions: [
          TextButton(onPressed: () => c.pop(false), child: const Text('Later')),
          FilledButton(style: FilledButton.styleFrom(minimumSize: const Size(0, 40)), onPressed: () => c.pop(true), child: const Text('Download')),
        ],
      ),
    );
    if (go == true) await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  } catch (_) {
    if (!quiet && context.mounted) showMessage(context, "Couldn't check for updates. Try again when online.");
  }
}
