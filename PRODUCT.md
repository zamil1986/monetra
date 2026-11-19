# Product

<!-- impeccable:product-schema 1 -->

## Platform

web, android

## Stack

Next.js (TypeScript) + Tailwind CSS, installable web app (manifest only), Prisma + PostgreSQL (Neon), deployed on Vercel. Android app: Flutter in `mobile/`, offline-first with a local SQLite copy synced to the Next.js API (ADR 0005), distributed as an APK from GitHub Releases. Source: `finance_tracker_prd.md` section 6. No code exists yet; the first design deliverable is a static HTML prototype of every screen, chosen by the user on 2026-11-14.

## Users

- **Primary:** one person tracking their own money in Indonesia: students managing a monthly allowance, workers watching salary and spending, anyone building a tracking habit. No accounting knowledge. They keep money in several places at once (cash, bank, e-wallet) and use two devices: a Mac in a browser and a Redmi Android phone, one-handed.
- **Secondary:** portfolio reviewers. They open the public URL for a few minutes, will not register, and must land in a populated app through "Try demo".

## Product Purpose

Monetra records Income, Expense, and Transfer across the user's Wallets, shows where the money is and how much there is in total, and explains spending through periods, categories, reports, and monthly budgets. Success: a transaction is recorded in a few taps without confusion, and every balance and summary is identical on both devices.

## Positioning

Money lives in Wallets, and moving it between them is a Transfer, never Income or Expense. Totals therefore stay true when the user tops up an e-wallet or withdraws cash. The server computes every figure in the user's profile time zone, so two devices never disagree.

## Operating Context

- Recording happens on the phone, right after spending, often standing or in transit. Reviewing happens on the Mac.
- Rupiah only, whole numbers, no decimals (ADR 0002). Amounts are large: Rp25.000 is a snack, Rp2.000.000 is a wallet balance.
- Typical wallets: Cash, BCA, GoPay and similar e-wallets.
- The web app is online-only: offline shows a banner and disables every write.
- The Android app (Flutter, user decision 2026-11-19, ADR 0005) is offline-first: it records and computes figures locally, then syncs when online. It is an APK from GitHub Releases, not the Play Store. iPhone is postponed (native distribution needs a paid Apple account). No push notifications: budget warnings appear only inside the app.

## Capabilities and Constraints

- Screens required (PRD 4.3): Login, Register, Forgot Password, Reset Password, Dashboard, Transactions, Add Transaction, Edit Transaction, Wallets, Categories, Budgets, Reports, Settings.
- Desktop navigation is a sidebar: Dashboard, Transactions, Wallets, Categories, Budgets, Reports, Settings. Mobile is a bottom bar: Home, Transactions, Add Transaction, Reports, Settings. On mobile, Wallets opens from the balance card on Home and from Settings; Categories and Budgets open from Settings.
- Add Transaction defaults to Expense, now, and the last-used Wallet.
- Total Balance and Wallet balances are always current and never change with the period. Income, Expense, and Net Cash Flow follow the period. Transfer is excluded from all three.
- Negative balances are allowed and shown in red.
- A Wallet can be archived only at exactly Rp0. Used Wallets and Categories are archived, never deleted.
- Deleting a transaction needs a confirmation dialog; there is no trash or restore.
- Budgets are per calendar month and repeat; warnings at 80% and at 100% or more.
- Every page handles loading, empty, success, error, validation, and offline states.
- Demo accounts expire 24 hours after creation.
- **UI language: English throughout** (user decision, 2026-11-14). Domain terms map from `CONTEXT.md`: Dompet = Wallet, Saldo awal = Opening balance, Saldo = Balance, Kategori = Category, Periode = Period, Arsip = Archive, Akun = Account. "Account" always means the login identity, never a place money is kept.
- Phasing: Phase 1 core (auth, wallets, transactions, dashboard), Phase 2 insights (custom categories, reports), Phase 3 budgets. The prototype covers all three.

## Brand Commitments

- Name: **Monetra** (user decision, 2026-11-14).
- No logo, typeface, or color commitment exists yet.

## Evidence on Hand

- `finance_tracker_prd.md`, `CONTEXT.md`, `docs/adr/0001` to `0003`.
- No real user data, screenshots, testimonials, or brand assets. All figures in the prototype are synthetic demo data.

## Product Principles

1. Recording comes first: the shortest path in the app is adding a transaction.
2. The numbers are the product: balances and totals must be instantly readable and never ambiguous about sign, type, or period.
3. Transfer is not spending: the interface keeps it visibly distinct from Income and Expense everywhere.
4. One truth on every device: the same figures, the same order, the same words on Mac and phone.
5. Honest about incompleteness: negative balances, empty periods, and offline are normal states, not errors.

## Accessibility & Inclusion

No product-specific standard was set. Money state must never rely on color alone: sign, label, or icon accompanies every red or green figure.
