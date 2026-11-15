# Monetra

Personal finance tracker (see `finance_tracker_prd.md`, `CONTEXT.md` and `docs/adr`). Built so far: **Dompet + Transaksi**, end to end.

## Run locally

```bash
npm install
cp .env.example .env     # DATABASE_URL, TEST_DATABASE_URL, DEV_USER_EMAIL
npm run db:up            # Postgres 17 in Docker on port 5433 (also creates monetra_test)
npx prisma migrate dev   # apply migrations to the dev database
DATABASE_URL=postgresql://monetra:monetra@localhost:5433/monetra_test npx prisma migrate deploy
npm run db:seed          # sample account for DEV_USER_EMAIL
npm run dev              # http://localhost:3000
```

Sign-in (PRD 3.1) is not built yet. In development every request acts as the account named by `DEV_USER_EMAIL`; in production the API refuses until auth replaces `src/server/session.ts`.

## Layout

- `src/domain` — pure business rules (Saldo, Transaksi rules, Dompet rules, rupiah parsing, local time). No database, no HTTP.
- `src/server` — services that load data, apply the domain rules inside database transactions, and enforce ownership.
- `src/app/api` — REST route handlers (PRD 8): parse with zod, call a service, map refusals to JSON errors.
- `src/app` — screens ported from `prototype/`, styled with Tailwind CSS v4.
- `src/app/globals.css` — the design tokens (`@theme`) taken from the prototype; `src/components/ui.tsx` — shared buttons, fields, notices and layout classes.

## Tests

`npm test` runs the domain unit tests and the service tests against `TEST_DATABASE_URL`. `npm run typecheck` runs TypeScript.
