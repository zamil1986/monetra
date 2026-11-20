import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../app/providers.dart';
import '../app/update.dart';
import '../data/api.dart';
import '../data/sync.dart';
import '../ui/format.dart';
import '../ui/l10n.dart';
import '../ui/theme.dart';
import '../ui/widgets.dart';
import 'auth.dart' show LanguagePicker, authMessage;

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
    final t = context.t;

    Future<void> online(Future<void> Function() f, String done) async {
      try {
        await f();
        await ref.read(syncSchedulerProvider).now();
        if (context.mounted) showMessage(context, done);
      } catch (e) {
        if (context.mounted) showMessage(context, isOffline(e) ? t('m.needsConnection') : authMessage(e, t));
      }
    }

    return Scaffold(
      appBar: AppBar(title: Text(t('m.nav.more'))),
      body: ListView(children: [
        const SyncBanner(),
        ListTile(
          leading: const Icon(Icons.person_outline),
          title: Text(l?.profileName ?? '–', style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Text(l?.profileEmail ?? ''),
        ),
        ListTile(
          leading: const Icon(Icons.category_outlined),
          title: Text(t('nav.categories')),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('/categories'),
        ),
        ListTile(
          leading: const Icon(Icons.schedule),
          title: Text(t('settings.timezone')),
          subtitle: Text(t('m.settings.timezoneSub')),
          trailing: DropdownButton<String>(
            value: _timezones.containsKey(l?.timezone) ? l!.timezone : null,
            hint: Text(l?.timezone ?? ''),
            underline: const SizedBox.shrink(),
            items: [for (final MapEntry(key: k, value: v) in _timezones.entries) DropdownMenuItem(value: k, child: Text(v))],
            onChanged: (tz) => tz == null ? null : online(() => ref.read(apiProvider).updateProfile(timezone: tz), t('m.settings.timezoneSaved')),
          ),
        ),
        // Shows at once, even offline; the Akun and the web follow at the next sync (ADR 0006).
        ListTile(
          leading: const Icon(Icons.translate),
          title: Text(t('lang.label')),
          subtitle: Text(t('settings.languageSub')),
        ),
        const Padding(padding: EdgeInsets.fromLTRB(16, 0, 16, 8), child: LanguagePicker(forAccount: true)),
        // This phone only, never synced: the web keeps its own (ADR 0007).
        ListTile(
          leading: const Icon(Icons.contrast),
          title: Text(t('theme.label')),
          subtitle: Text(t('settings.themeSub')),
        ),
        const Padding(padding: EdgeInsets.fromLTRB(16, 0, 16, 8), child: ThemePicker()),
        ListTile(
          leading: const Icon(Icons.lock_outline),
          title: Text(t('m.settings.changePassword')),
          onTap: () => showDialog(
              context: context,
              builder: (_) => _ChangePassword(
                  onSubmit: (current, next) => online(() => ref.read(apiProvider).changePassword(current, next), t('m.settings.passwordChanged')))),
        ),
        const Divider(),
        ListTile(
          leading: Icon(state == SyncState.syncing ? Icons.sync : pending > 0 ? Icons.cloud_upload_outlined : Icons.cloud_done_outlined),
          title: Text(state == SyncState.syncing
              ? t('m.sync.syncing')
              : pending > 0
                  ? t('m.sync.pending', {'count': pending})
                  : t('m.sync.allSynced')),
          subtitle: Text(lastAt == null ? t('m.sync.never') : t('m.sync.last', {'when': whenShort(DateTime.parse(lastAt), l?.timezone ?? 'Asia/Jakarta', t)})),
          trailing: TextButton(onPressed: () => ref.read(syncSchedulerProvider).now(), child: Text(t('m.sync.now'))),
        ),
        if (failures.isNotEmpty) ...[
          Notice(t('m.sync.refused', {'count': failures.length}), tone: NoticeTone.warn,
              action: TextButton(onPressed: () => ref.read(repositoryProvider).dismissFailures(), child: Text(t('m.dismiss')))),
          for (final f in failures) ListTile(dense: true, title: Text(f.message), subtitle: Text('${f.entity} · ${f.code}')),
        ],
        const Divider(),
        ListTile(
          leading: const Icon(Icons.system_update_outlined),
          title: Text(t('m.settings.version')),
          subtitle: Text(version ?? ''),
          trailing: TextButton(onPressed: () => checkForUpdate(context, ref, version, quiet: false), child: Text(t('m.settings.check'))),
        ),
        ListTile(
          leading: Icon(Icons.logout, color: context.c.red),
          title: Text(t('shell.signOut'), style: TextStyle(color: context.c.red)),
          onTap: () => _signOut(context, ref),
        ),
      ]),
    );
  }

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    final session = ref.read(sessionProvider.notifier);
    if (await session.signOut()) return;
    if (!context.mounted) return;
    final t = context.t;
    final discard = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text(t('m.signOut.title')),
        content: Text(t('m.signOut.body')),
        actions: [
          TextButton(onPressed: () => c.pop(false), child: Text(t('m.signOut.stay'))),
          TextButton(onPressed: () => c.pop(true), style: TextButton.styleFrom(foregroundColor: context.c.red), child: Text(t('m.signOut.anyway'))),
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
  Widget build(BuildContext context) {
    final t = context.t;
    return AlertDialog(
        title: Text(t('m.settings.changePassword')),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: current, obscureText: true, decoration: InputDecoration(labelText: t('m.settings.currentPassword'))),
          const SizedBox(height: 12),
          TextField(controller: next, obscureText: true, decoration: InputDecoration(labelText: t('auth.newPassword'), helperText: t('auth.passwordHint'))),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text(t('common.cancel'))),
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: const Size(0, 40)),
            onPressed: () {
              Navigator.pop(context);
              widget.onSubmit(current.text, next.text);
            },
            child: Text(t('m.save')),
          ),
        ],
      );
  }
}

/// System, Light or Dark for this phone, stored in the local settings table (ADR 0007).
class ThemePicker extends ConsumerWidget {
  const ThemePicker({super.key});

  static const _icons = {'system': Icons.brightness_auto_outlined, 'light': Icons.light_mode_outlined, 'dark': Icons.dark_mode_outlined};

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final mode = ref.watch(themeModeProvider).value ?? ThemeMode.system;
    return SegmentedButton<String>(
      showSelectedIcon: false,
      segments: [for (final p in themePrefs) ButtonSegment(value: p, icon: Icon(_icons[p]), label: Text(t('theme.$p')))],
      selected: {mode.name},
      onSelectionChanged: (s) => ref.read(databaseProvider).putSetting('device.theme', s.first),
    );
  }
}
