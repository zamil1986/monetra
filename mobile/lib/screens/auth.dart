import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../app/providers.dart';
import '../data/api.dart';
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
            const Text.rich(TextSpan(text: 'MONETRA', children: [TextSpan(text: '.', style: TextStyle(color: C.yellow))]),
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: C.cobalt)),
            const SizedBox(height: 32),
            Text(title, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(lead, style: const TextStyle(color: C.ink2)),
            const SizedBox(height: 24),
            ...children,
          ]),
        ),
      );
}

String authMessage(Object e) {
  if (isOffline(e)) return "Couldn't reach Monetra. Signing in needs a connection the first time.";
  if (e is ApiError) {
    return switch (e.code) {
      'INVALID_EMAIL_OR_PASSWORD' => "That email and password don't match an account.",
      'USER_ALREADY_EXISTS' || 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' => 'An account with that email already exists.',
      _ => e.message,
    };
  }
  return 'Something went wrong. Try again.';
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
      if (mounted) setState(() => error = authMessage(e));
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
          if (error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(error!, style: const TextStyle(color: C.red))),
          FilledButton(onPressed: busy ? null : submit, child: Text(busy ? 'Please wait…' : widget.submitLabel)),
        ]),
      );
}

class LoginScreen extends ConsumerWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final again = ref.watch(sessionProvider) == Session.needsSignIn;
    return AuthScaffold(
      title: 'Sign in',
      lead: again ? 'Your session ended. Sign in to sync what you recorded.' : 'Use the email you registered with.',
      children: [
        _AuthForm(
          submitLabel: 'Sign in',
          fields: const [
            ('email', 'Email', TextInputType.emailAddress, false, null),
            ('password', 'Password', TextInputType.visiblePassword, true, null),
          ],
          onSubmit: (v) async {
            await ref.read(sessionProvider.notifier).signIn(v['email']!, v['password']!);
            if (context.mounted) context.go('/');
          },
        ),
        TextButton(onPressed: () => context.push('/forgot-password'), child: const Text('Forgot password?')),
        const SizedBox(height: 24),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Text('No account yet?'),
          TextButton(onPressed: () => context.push('/register'), child: const Text('Create one')),
        ]),
      ],
    );
  }
}

class RegisterScreen extends ConsumerWidget {
  const RegisterScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) => AuthScaffold(
        title: 'Create your account',
        lead: 'You start with a Tunai wallet and the usual categories.',
        children: [
          _AuthForm(
            submitLabel: 'Create account',
            fields: const [
              ('name', 'Name', TextInputType.name, false, null),
              ('email', 'Email', TextInputType.emailAddress, false, null),
              ('password', 'Password', TextInputType.visiblePassword, true, 'At least 8 characters.'),
            ],
            onSubmit: (v) async {
              // Day boundaries follow the profile time zone; Indonesia's western zone is the usual one.
              final timezone = switch (DateTime.now().timeZoneOffset.inHours) { 8 => 'Asia/Makassar', 9 => 'Asia/Jayapura', _ => 'Asia/Jakarta' };
              await ref.read(sessionProvider.notifier).signUp(v['name']!, v['email']!, v['password']!, timezone);
              if (context.mounted) context.go('/');
            },
          ),
        ],
      );
}

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});
  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotState();
}

class _ForgotState extends ConsumerState<ForgotPasswordScreen> {
  String? sentTo;

  @override
  Widget build(BuildContext context) => AuthScaffold(
        title: 'Reset your password',
        lead: "We'll email you a link to choose a new one.",
        children: [
          if (sentTo != null)
            Notice('If $sentTo has an account, a reset link is on its way. It expires in one hour.')
          else
            _AuthForm(
              submitLabel: 'Send reset link',
              fields: const [('email', 'Email', TextInputType.emailAddress, false, null)],
              onSubmit: (v) async {
                await ref.read(apiProvider).requestPasswordReset(v['email']!.trim());
                setState(() => sentTo = v['email']!.trim());
              },
            ),
        ],
      );
}
