---
version: 1
slug: "prototype-dashboard-html"
primary_target: "prototype/dashboard.html"
related_targets: ["prototype"]
---

# Monetra app prototype (all screens)

**Scope:** static HTML prototype of every screen in PRD 4.3 under `prototype/`, desktop (sidebar) and mobile (bottom bar). **Mode:** Operate. The screen index `prototype/index.html` is Read.

**Audience and job:** one person recording Income, Expense and Transfer on a Redmi phone right after spending, and reviewing on a Mac. Portfolio reviewers enter through "Try demo" and must see a populated Dashboard at once.

**Content:** synthetic demo data only (wallets BCA, Jago Savings, Cash, GoPay, OVO; November 2026). UI language English; amounts in id-ID format (Rp 10.322.500).

**Constraints:** standard web controls only. Red means overspending or a negative balance and nothing else. Transfer is always shown as neutral, never as income or expense. Money state never relies on color alone.

## Direction contract

THESIS: Money is read by the date. The month is a sheet of day cells, and a red date is a day spent above the daily pace. Refuses the fintech default of rounded white cards on grey with a donut chart and one green accent.

OWN-WORLD: Indonesian giveaway wall calendar. Cobalt sponsor band as the shell (#1B3FAB), bright cool paper ground, ink-black heavy condensed figures (Archivo at narrow width, weight 800 to 900), calendar red for overspending and negatives, yellow for today and selection, green for income. Hairline grids closed by a 2px ink top rule instead of boxed cards. One family for everything. Each Wallet owns one full-strength hue.

STORY: The visitor sees how much money there is and where it sits, then how this period went, then which days went over. They trust the figures because every amount shares one tabular right edge and one sign convention, and they add a transaction in a few taps.

FIRST VIEWPORT: Dashboard at 1440 x 900. Cobalt sidebar 232px with wordmark, seven nav items and a yellow Add transaction button. Page head with title and the period control. Left work area: Total balance at about 72px over a five-wallet strip, then Income, Expense and Net cash flow for the period, then Recent transactions. Right work area, 440px: the November month sheet with per-day spend bars, red dates, today in yellow, and the monthly budget pace bar. On mobile the Add button sits at the centre of the bottom bar.

FORM: Wall calendar, candidate 4 of 7 on the grounded list (banknotes, bank passbook, transit map, wall calendar, budgeting envelopes, receipts, batik). seed:f0ee915afb2979fe. Signature move: the month sheet, reused on Dashboard, Budgets, Reports and day headers in Transactions. Selecting a day brings it forward and quiets the rest. Motion: 150 to 200ms state transitions only.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Dark theme (2026-11-21, ADR 0007)

The same wall calendar in a dark room. Paper, ink, lines and the meaning colors flip through `light-dark()` tokens (paper `#0F1115`, ink `#E9ECF1`, red `#FF6B5E`, green `#4CC38A`, cobalt as text `#8FA8FF`); the cobalt band, yellow, white and on-yellow ink never flip. Filled ink, red and green chips take `paper` text so they invert with the fill; anything on yellow takes `on-yellow`; inside the cobalt band stays white. Wallet and Category hues are lifted slightly in dark so they hold a white glyph (3:1) and stand off the dark paper (3:1). Theme is System, Light or Dark per device; tokens mirrored in `mobile/lib/ui/theme.dart`.

## Unresolved

- No logo; the wordmark is set in type.
- Red dates need an overall monthly Budget (Phase 3); before one exists the sheet shows bars only.
