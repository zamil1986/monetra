# Monetra

Personal finance tracker (see `finance_tracker_prd.md`, `CONTEXT.md` and `docs/adr`). Two clients share one account:

- **Web** (Next.js, this folder): online only. It is also the server the Android app syncs with.
- **Android** (Flutter, `mobile/`): offline-first. It keeps a local copy and syncs when online ([ADR 0005](docs/adr/0005-offline-first-android-sinkronisasi.md)). Downloaded free as an APK from `/download`.

## Run the web app and server locally

```bash
npm install
cp .env.example .env     # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
npm run db:up            # Postgres 17 in Docker on port 5433 (also creates monetra_test)
npx prisma migrate dev   # apply migrations to the dev database
DATABASE_URL=postgresql://monetra:monetra@localhost:5433/monetra_test npx prisma migrate deploy
npm run db:seed          # dina@example.com / monetra-dev, with sample data
npm run dev              # http://localhost:3000
```

Sign in with the seeded account, register a new one, or press **Try demo**. Without `RESEND_API_KEY`, password-reset emails are printed in the `npm run dev` log.

## Run the Android app

```bash
cd mobile
flutter pub get
dart run build_runner build             # generates the drift database code
flutter run                             # emulator: reaches the Mac's dev server at 10.0.2.2:3000
flutter run --dart-define=API_URL=http://192.168.1.20:3000   # a real phone on the same Wi-Fi (npm run dev:phone)
```

## Deploy the web app

Vercel project `monetra` deploys `main` on every push. Its `vercel-build` script applies Prisma migrations to Neon (through `DATABASE_URL_UNPOOLED`) before `next build`. Production needs `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and optionally `RESEND_API_KEY`.

## Release an APK

Pushing a `v*` tag runs `.github/workflows/android-release.yml`: tests, a signed release build, and a GitHub Release with `monetra.apk`. `/download` and the in-app update check read the newest release. It needs:

- repository **secrets** `MONETRA_KEYSTORE_BASE64`, `MONETRA_KEYSTORE_PASSWORD`, `MONETRA_KEY_ALIAS`, `MONETRA_KEY_PASSWORD` (always the same keystore, or Android refuses updates);
- repository **variable** `MONETRA_API_URL`, the https URL of the deployed web app;
- a **public** repository, so the APK link downloads without signing in to GitHub.

## Layout

- `src/domain`: pure business rules (Saldo, Periode, Transaksi rules, Dompet and Kategori rules, rupiah parsing, local time). No database, no HTTP.
- `src/server`: services that load data, apply the domain rules inside database transactions, and enforce ownership. `sync.ts` is the push/pull Sinkronisasi; `auth.ts` is Better Auth (cookie for the web, bearer token for Android).
- `src/app/api`: REST route handlers: parse with zod, call a service, map refusals to JSON errors.
- `src/app`: screens ported from `prototype/`, styled with Tailwind CSS v4.
- `shared/fixtures`: cases both the TypeScript and the Dart rules must pass, so the phone's offline figures match the server's.
- `mobile/lib/domain`: the Dart port of `src/domain`. `mobile/lib/data`: the local database (drift), outbox, sync engine and API client. `mobile/lib/screens`: the app's screens.

## Tests

- `npm test`: domain unit tests, shared fixtures, and service and sync tests against `TEST_DATABASE_URL`. `npm run typecheck` runs TypeScript.
- `cd mobile && flutter test`: Dart domain and shared fixtures, plus widget tests of the app running offline.
- `MONETRA_E2E=http://localhost:3000 flutter test test/sync_e2e_test.dart`: two simulated phones syncing through a running `npm run dev`.
