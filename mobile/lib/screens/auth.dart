import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../app/providers.dart';
import '../data/api.dart';
import '../domain/i18n.dart';
import '../ui/l10n.dart';
import '../ui/theme.dart';
import '../ui/widgets.dart';

/// Sign-in screens (PRD 3.1). They need a connection; everything after works offline.
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({super.key, required this.title, required this.lead, required this.children});
  final String title;
  final String lead;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: ListView(padding: const EdgeInsets.fromLTRB(20, 32, 20, 32), children: [
            Row(children: [
              Expanded(
                child: Text.rich(TextSpan(text: 'MONETRA', children: const [TextSpan(text: '.', style: TextStyle(color: C.yellow))]),
                    style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: context.c.cobaltInk)),
              ),
              // Before signing in the Bahasa follows the phone; picking one here is kept and used at sign-up.
              const LanguagePicker(forAccount: false, compact: true),
            ]),
            const SizedBox(height: 32),
            Text(title, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(lead, style: TextStyle(color: context.c.ink2)),
            const SizedBox(height: 24),
            ...children,
          ]),
        ),
      );
}

/// A sign-in refusal in the Bahasa of [t]: Better Auth's known codes are translated here,
/// Monetra's own refusals already arrive translated.
String authMessage(Object e, Strings t) {
  if (isOffline(e)) return t('m.auth.unreachable');
  if (e is ApiError) {
    final code = e.code == 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' ? 'USER_ALREADY_EXISTS' : e.code;
    final key = 'auth.error.$code';
    return translate(t.lang, key) != key ? t(key) : e.message;
  }
  return t('common.somethingWrong');
}

/// Picks the Bahasa: ID or EN. Signed in, the choice goes to the Akun and every Perangkat follows.
class LanguagePicker extends ConsumerWidget {
  const LanguagePicker({super.key, required this.forAccount, this.compact = false});
  final bool forAccount;
  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    return SegmentedButton<String>(
      showSelectedIcon: !compact,
      style: compact ? const ButtonStyle(visualDensity: VisualDensity.compact) : null,
      segments: [
        for (final l in langs)
          ButtonSegment(value: l, label: Text(compact ? t('lang.short.$l') : t('lang.$l')), tooltip: compact ? t('lang.$l') : null),
      ],
      selected: {t.lang},
      onSelectionChanged: (s) => ref.read(repositoryProvider).setLanguage(s.first, forAccount: forAccount),
    );
  }
}

/// A form that locks its button while the request runs and keeps what was typed on failure.
class _AuthForm extends StatefulWidget {
  const _AuthForm({required this.fields, required this.submitLabel, required this.onSubmit});
  final List<(String key, String label, TextInputType type, bool secret, String? hint)> fields;
  final String submitLabel;
  final Future<void> Function(Map<String, String> values) onSubmit;

  @override
  State<_AuthForm> createState() => _AuthFormState();
}

class _AuthFormState extends State<_AuthForm> {
  late final controllers = {for (final f in widget.fields) f.$1: TextEditingController()};
  String? error;
  bool busy = false;

  @override
  void dispose() {
    for (final c in controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> submit() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.onSubmit(controllers.map((k, c) => MapEntry(k, c.text)));
    } catch (e) {
      if (mounted) setState(() => error = authMessage(e, context.t));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => AutofillGroup(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          for (final f in widget.fields) ...[
            Text(f.$2, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            TextField(
              controller: controllers[f.$1],
              keyboardType: f.$3,
              obscureText: f.$4,
              autocorrect: false,
              enableSuggestions: !f.$4,
              autofillHints: [
                if (f.$3 == TextInputType.emailAddress) AutofillHints.email,
                if (f.$4) AutofillHints.password,
                if (f.$1 == 'name') AutofillHints.name,
              ],
              decoration: InputDecoration(helperText: f.$5),
            ),
            const SizedBox(height: 16),
          ],
          if (error != null) Padding(padding: EdgeInsets.only(bottom: 12), child: Text(error!, style: TextStyle(color: context.c.red))),
          FilledButton(onPressed: busy ? null : submit, child: Text(busy ? context.t('auth.wait') : widget.submitLabel)),
        ]),
      );
}

class LoginScreen extends ConsumerWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final again = ref.watch(sessionProvider) == Session.needsSignIn;
    final t = context.t;
    return AuthScaffold(
      title: t('login.title'),
      lead: again ? t('m.auth.sessionEnded') : t('login.sub'),
      children: [
        _AuthForm(
          submitLabel: t('login.submit'),
          fields: [
            ('email', t('common.email'), TextInputType.emailAddress, false, null),
            ('password', t('common.password'), TextInputType.visiblePassword, true, null),
          ],
          onSubmit: (v) async {
            await ref.read(sessionProvider.notifier).signIn(v['email']!, v['password']!);
            if (context.mounted) context.go('/');
          },
        ),
        TextButton(onPressed: () => context.push('/forgot-password'), child: Text(t('login.forgot'))),
        const SizedBox(height: 24),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Text(t('m.login.noAccount')),
          TextButton(onPressed: () => context.push('/register'), child: Text(t('m.login.createOne'))),
        ]),
      ],
    );
  }
}

class RegisterScreen extends ConsumerWidget {
  const RegisterScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    return AuthScaffold(
        title: t('register.title'),
        lead: t('register.sub'),
        children: [
          _AuthForm(
            submitLabel: t('register.submit'),
            fields: [
              ('name', t('common.name'), TextInputType.name, false, null),
              ('email', t('common.email'), TextInputType.emailAddress, false, null),
              ('password', t('common.password'), TextInputType.visiblePassword, true, t('auth.passwordHint')),
            ],
            onSubmit: (v) async {
              // Day boundaries follow the profile time zone; Indonesia's western zone is the usual one.
              final timezone = switch (DateTime.now().timeZoneOffset.inHours) { 8 => 'Asia/Makassar', 9 => 'Asia/Jayapura', _ => 'Asia/Jakarta' };
              await ref.read(sessionProvider.notifier).signUp(v['name']!, v['email']!, v['password']!, timezone, t.lang);
              if (context.mounted) context.go('/');
            },
          ),
        ],
      );
  }
}

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});
  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotState();
}

class _ForgotState extends ConsumerState<ForgotPasswordScreen> {
  String? sentTo;

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    return AuthScaffold(
        title: t('forgot.title'),
        lead: t('forgot.sub'),
        children: [
          if (sentTo != null)
            Notice(t.plain('forgot.sent', {'email': sentTo}))
          else
            _AuthForm(
              submitLabel: t('forgot.submit'),
              fields: [('email', t('common.email'), TextInputType.emailAddress, false, null)],
              onSubmit: (v) async {
                await ref.read(apiProvider).requestPasswordReset(v['email']!.trim());
                setState(() => sentTo = v['email']!.trim());
              },
            ),
        ],
      );
  }
}
