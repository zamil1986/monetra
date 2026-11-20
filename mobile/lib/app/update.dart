import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/api.dart' show isOffline;
import '../ui/l10n.dart';
import '../ui/widgets.dart';
import 'providers.dart';

const _channel = MethodChannel('monetra/update');

/// Negative when [a] is older than [b]; compares x.y.z numerically.
int compareVersions(String a, String b) {
  final x = a.split('.').map((p) => int.tryParse(p) ?? 0).toList();
  final y = b.split('.').map((p) => int.tryParse(p) ?? 0).toList();
  for (var i = 0; i < 3; i++) {
    final d = (i < x.length ? x[i] : 0) - (i < y.length ? y[i] : 0);
    if (d != 0) return d;
  }
  return 0;
}

/// Asks the server for the newest APK and offers to install it. Quiet mode says nothing when up to date or offline.
Future<void> checkForUpdate(BuildContext context, WidgetRef ref, String? current, {bool quiet = true}) async {
  if (current == null) return;
  final String version;
  final String url;
  try {
    final latest = await ref.read(apiProvider).appVersion();
    if (latest['version'] is! String || latest['apkUrl'] is! String) throw const FormatException();
    version = latest['version'] as String;
    url = latest['apkUrl'] as String;
  } catch (_) {
    if (!quiet && context.mounted) showMessage(context, context.t('m.update.failed'));
    return;
  }
  if (!context.mounted) return;
  if (compareVersions(version, current) <= 0) {
    if (!quiet) showMessage(context, context.t('m.update.latest'));
    return;
  }
  final t = context.t;
  final go = await showDialog<bool>(
    context: context,
    builder: (c) => AlertDialog(
      title: Text(t('m.update.title', {'version': version})),
      content: Text(t('m.update.body', {'current': current})),
      actions: [
        TextButton(onPressed: () => c.pop(false), child: Text(t('m.update.later'))),
        FilledButton(style: FilledButton.styleFrom(minimumSize: const Size(0, 40)), onPressed: () => c.pop(true), child: Text(t('m.update.download'))),
      ],
    ),
  );
  if (go == true && context.mounted) await _downloadAndInstall(context, version, url);
}

Future<void> _downloadAndInstall(BuildContext context, String version, String url) async {
  final progress = ValueNotifier<double?>(null);
  final cancel = CancelToken();
  final t = context.t;
  final nav = Navigator.of(context, rootNavigator: true);
  var open = true;
  void close() {
    if (open) nav.pop();
    open = false;
  }
  showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (c) => PopScope(
      canPop: false,
      child: AlertDialog(
        title: Text(t('m.update.downloading', {'version': version})),
        content: ValueListenableBuilder(
          valueListenable: progress,
          builder: (_, p, _) => Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            LinearProgressIndicator(value: p),
            const SizedBox(height: 8),
            Text(p == null ? t('m.update.starting') : '${(p * 100).round()}%'),
          ]),
        ),
        actions: [TextButton(onPressed: () => cancel.cancel(), child: Text(t('m.update.cancel')))],
      ),
    ),
  );
  try {
    final dir = Directory('${(await getTemporaryDirectory()).path}/updates');
    if (dir.existsSync()) dir.deleteSync(recursive: true);
    dir.createSync(recursive: true);
    final path = '${dir.path}/monetra-$version.apk';
    // A plain client: the API one would send the session token to GitHub.
    await Dio().download(url, path, cancelToken: cancel, onReceiveProgress: (got, total) {
      if (total > 0) progress.value = got / total;
    });
    close();
    await _channel.invokeMethod('installApk', {'path': path});
  } catch (e) {
    close();
    if (e is DioException && CancelToken.isCancel(e)) return;
    if (!context.mounted) return;
    final browser = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text(t('m.update.installFailed')),
        content: Text(t(isOffline(e) ? 'm.update.stopped' : 'm.update.useBrowser')),
        actions: [
          TextButton(onPressed: () => c.pop(false), child: Text(t('m.update.close'))),
          FilledButton(style: FilledButton.styleFrom(minimumSize: const Size(0, 40)), onPressed: () => c.pop(true), child: Text(t('m.update.openBrowser'))),
        ],
      ),
    );
    if (browser == true) await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  } finally {
    progress.dispose();
  }
}
