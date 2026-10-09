# MathsAlot Studio — Accessibility Audit

Phase 08 release verification. Owner: `studio-web`. This is the standalone accessibility
artifact Phase 07's exit criterion ("accessibility pass recorded") did not produce.

- Date: 2026-10-08
- Scope: the `studio-web` delivery repo (`studio-web/`), every console screen.
- Standard: WCAG 2.1 AA (target), plus the Vercel Web Interface Guidelines.
- Repo state audited: branch `main`, working tree with the Phase 08 changes listed in §6.

## 1. Method and environment limits (read first)

Two kinds of evidence are recorded below and they are kept strictly separate:

1. **Executed** — a command or tool that was actually run in this environment; its output is
   pasted in §2.
2. **Not executed** — a check that could not be run, with the reason. Nothing is marked
   "pass" on inspection alone.

**Environment limit.** The authenticated console screens require a running Studio API, a
Studio-owned database, and an authenticated session. A database target now exists — the configured
Neon host is alive (D-054 correction) and its migrations are applied — so the database is no longer
the reason these screens are unaudited. The remaining reason is that **no running API + web pair
with an authenticated session was exercised in this environment**: the API has no deployed instance
here, and no test admin session was established. Consequently:

- The **login** screen renders without a backend (anonymous session resolves to `null`) and was
  audited in a real browser with Lighthouse and axe-core (§2.1, §2.2).
- **All authenticated screens were not loaded in a real browser.** For those, the checks are
  marked **NOT EXECUTED (live)** and the pass/fail recorded is a **source + test** judgement, not
  a rendered-DOM judgement. This is a "not run in this environment" statement, not an
  "impossible" one.

No screenshots are included: no fabricated or illustrative images, and the one real page that
could be rendered did not need one (its axe/Lighthouse output is the evidence).

## 2. Executed automated tooling

### 2.1 Lighthouse (real browser, `/login`)

Server: `npm run start -- --port 3399` (production build). Page:
`http://localhost:3399/login`. Lighthouse `13.4.1`:

```
accessibility score: 1
best-practices 1
seo 0.8
```

Accessibility **1.0**; no accessibility audit scored below 1 (the run's failing-audit list for
the accessibility category was empty). SEO 0.8 is not applicable — this is an authenticated
internal console, not a crawlable site.

### 2.2 axe-core (real browser, `/login`)

`axe-core 4.10.2` injected into the rendered page and run over the whole document:

```
{ "version": "4.10.2", "violations": [] }
```

**Zero violations** (0 WCAG A/AA and best-practice violations) on the login screen.

### 2.3 Token contrast computation (executed)

Committed script: `scripts/check-contrast.mjs` (`npm run check:contrast`). It reads every token
value from the shipped `src/app/globals.css` `:root` block — the tokens that actually ship, not a
separate copy — and computes the WCAG 2.x relative-luminance contrast for each pair the UI uses,
including alpha compositing for the sidebar text opacities. It exits non-zero if any enforced pair
falls below threshold (text ≥ 4.5:1 under WCAG 1.4.3; control boundary / focus indicator ≥ 3:1 under
WCAG 1.4.11); decorative rows are printed for information and never fail the run. Real output
(`node scripts/check-contrast.mjs`, exit 0):

```
MathsAlot Studio — WCAG contrast matrix (tokens read from src/app/globals.css)

Text pairs — WCAG 1.4.3 (>= 4.5:1)
  PASS  15.57:1   foreground on background                     #16201a on #f6f7f6
  PASS  16.72:1   foreground on surface                        #16201a on #ffffff
  PASS  15.01:1   foreground on surface-muted                  #16201a on #f1f3f2
  PASS  16.72:1   foreground on card                           #16201a on #ffffff
  PASS  16.72:1   foreground on popover                        #16201a on #ffffff
  PASS  16.72:1   card-foreground on card                      #16201a on #ffffff
  PASS  16.72:1   popover-foreground on popover                #16201a on #ffffff
  PASS  15.01:1   secondary-foreground on secondary            #16201a on #f1f3f2
  PASS  5.44:1    muted-foreground on background               #5b6860 on #f6f7f6
  PASS  5.84:1    muted-foreground on surface                  #5b6860 on #ffffff
  PASS  5.24:1    muted-foreground on surface-muted            #5b6860 on #f1f3f2
  PASS  5.84:1    muted-foreground on card                     #5b6860 on #ffffff
  PASS  8.30:1    accent-foreground on accent                  #14532d on #dcfce7
  PASS  8.70:1    primary-foreground on primary                #f0fdf4 on #14532d
  PASS  8.30:1    primary-subtle-foreground on primary-subtle  #14532d on #dcfce7
  PASS  8.30:1    success-foreground on success-subtle         #14532d on #dcfce7
  PASS  8.15:1    warning-foreground on warning-subtle         #78350f on #fef3c7
  PASS  8.20:1    danger-foreground on danger-subtle           #7f1d1d on #fee2e2
  PASS  8.49:1    info-foreground on info-subtle               #1e3a8a on #dbeafe
  PASS  5.91:1    destructive-foreground on destructive        #fef2f2 on #b91c1c
  PASS  8.70:1    sidebar-foreground on sidebar                #f0fdf4 on #14532d
  PASS  8.30:1    sidebar-subtle-foreground on sidebar-subtle  #14532d on #dcfce7
  PASS  7.40:1    sidebar-foreground/90 on sidebar             #daece0 on #14532d
  PASS  6.77:1    sidebar-foreground/85 on sidebar             #cfe3d6 on #14532d
  PASS  5.71:1    sidebar-foreground/75 on sidebar             #b9d3c2 on #14532d
  PASS  5.18:1    sidebar-foreground/70 on sidebar             #aecab8 on #14532d

Non-text control boundaries & focus — WCAG 1.4.11 (>= 3:1)
  PASS  3.62:1    border-input on surface                      #7c8a80 on #ffffff
  PASS  3.37:1    border-input on background                   #7c8a80 on #f6f7f6
  PASS  3.25:1    border-input on surface-muted                #7c8a80 on #f1f3f2
  PASS  8.48:1    ring (focus) on background                   #14532d on #f6f7f6
  PASS  9.11:1    ring (focus) on surface                      #14532d on #ffffff
  PASS  6.49:1    sidebar-ring (focus) on sidebar              #86efac on #14532d

Decorative / structural — WCAG 1.4.11 exempt (informational)
  n/a   1.38:1    border on surface                            #d7ddd8 on #ffffff
  n/a   1.28:1    border on background                         #d7ddd8 on #f6f7f6
  n/a   1.91:1    border-strong on surface                     #b4beb6 on #ffffff
  n/a   1.78:1    border-strong on background                  #b4beb6 on #f6f7f6
  n/a   1.28:1    sidebar-muted on sidebar                     #166534 on #14532d

OK: 32/32 enforced pairs meet their WCAG threshold.
```

- **All 32 enforced pairs pass**: 26 text pairs at or above 4.5:1 and 6 non-text pairs at or above
  3:1. The 5 decorative rows are below 3:1 by design (SC 1.4.11 does not apply) and are reported
  as `n/a`.
- The **control boundary** `border-input` clears 3:1 on all three surfaces (surface **3.62:1**,
  background **3.37:1**, surface-muted **3.25:1**) — the D-058 fix, applied in
  `Input`/`Textarea`/`Select`/`Checkbox`/`Switch`/`NativeSelect` (§5).
- **Decorative / structural borders stay below 3:1 by design.** `border` (**1.38:1**) and
  `border-strong` (**1.91:1**) are used only for cards, dividers, table shells, headers/footers and
  badges — never as the sole boundary of an interactive control — so SC 1.4.11 does not apply. A
  text-labelled button/tab keeps its text as the affordance; its border is not required to meet 3:1.
- `sidebar-muted` **1.28:1** on `sidebar` is used only for decorative `Separator` rules inside the
  sidebar; WCAG 1.4.11 excludes purely decorative elements, so it is **not applicable**.
- Semantic badge pairs pass AA: success 8.30:1, warning 8.15:1, danger 8.20:1, info 8.49:1; neutral
  (`muted-foreground` on `surface-muted`) 5.24:1. Sidebar text passes at every alpha in use: /90
  7.40:1, /85 6.77:1, /75 5.71:1, /70 5.18:1. Sidebar focus ring 6.49:1 (non-text).
- The historical inactive-tab composite `text-foreground/60` over `background` (4.32:1, below AA)
  is **no longer shipped** — the fix in §5 replaced it with `text-muted-foreground` — so it is not a
  row in the shipped-token matrix.

**Executed:** the command above. **Not executed:** none in this subsection — the output is a
deterministic computation over the committed tokens. The live-browser checks that remain
outstanding are listed in §2.5.

### 2.4 Static + test gates (from `studio-web/`)

```
npm run lint       → clean (eslint ., typescript-eslint + js recommended; no-explicit-any = error)
npm run typecheck  → clean (tsc --noEmit)
npm run test       → Test Files 36 passed (36); Tests 156 passed (156)
npm run build      → compiled successfully in 9.6s; 59 route entries (58 ƒ dynamic, 1 ○ static /_not-found)
```

Structural accessibility coverage in the suite (grep): **124** `getByRole` queries across
**27** test files; **86** `aria-label` attributes; **59** `role="status"`/`role="alert"`
usages; **18** `aria-live` regions; **5** `aria-current`; **14** `TableCaption` (sr-only table
names); **0** raw hex colours in `src/components`.

### 2.5 Not executed

| Check | Reason |
| --- | --- |
| Lighthouse/axe on overview, worlds, world detail, trick detail, curriculum, nitty gritty, admin/ops | Not run: no running API + web pair with an authenticated session was exercised in this environment (the API has no deployed instance and no test admin session was established) |
| Screen-reader (NVDA/VoiceOver) walkthrough of any screen | No screen-reader runtime in this environment; human action |
| Manual 1280px / ~1024px visual verification of authenticated screens | No authenticated session; human action (carried from Phase 03d R-01) |
| Keyboard-only traversal of authenticated screens | Requires a rendered, authenticated screen |

## 3. Per-screen checklist

Legend: **PASS (source)** = verified against source + component tests; **PASS (live)** =
verified in a real browser; **N/E (live)** = live check not executed (§2.5).

Shared shell (all authenticated screens): skip link `#main-content` (`app/layout.tsx`),
`<main id="main-content" tabIndex={-1} aria-labelledby="…">` per page, `<aside aria-label="Studio
navigation">`, `<header>` top bar, `<footer>`, one `<h1>` per page from `PageHeader`, breadcrumb
`<nav aria-label="breadcrumb">` with `aria-current="page"` on the last crumb, visible focus via a
global `:focus-visible { outline: 2px solid var(--ring) }` plus a light `--sidebar-ring` override
on the dark sidebar, and `scroll-margin-top` so focus clears the sticky bars.

| Screen | Landmarks | Heading order | Keyboard path | Visible focus | Labels / errors | AA contrast | No color-only status | Reduced motion | Live browser |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Login | PASS (live) | PASS (live) | PASS (live) | PASS (live) | PASS (live) | PASS (live) | n/a | PASS (source) | PASS (axe 0, LH 1.0) |
| Overview (health) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | n/a | PASS (source) | PASS (source) | PASS (source) | N/E (live) |
| Worlds index | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | N/E (live) |
| World detail | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | N/E (live) |
| Trick detail | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | N/E (live) |
| Curriculum list | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | N/E (live) |
| Curriculum builder | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | N/E (live) |
| Nitty Gritty (families) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | N/E (live) |
| Nitty Gritty (family) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | N/E (live) |
| Admin dashboard | PASS (source) | PASS (source) | PASS (source) | PASS (source) | n/a | PASS (source) | PASS (source) | PASS (source) | N/E (live) |
| Admin activity | PASS (source) | PASS (source) | PASS (source) | PASS (source) | n/a | PASS (source) | PASS (source) | PASS (source) | N/E (live) |
| Admin comments | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | N/E (live) |
| Admin permissions | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | PASS (source) | N/E (live) |

Notes behind the source judgements:

- **Landmarks** — every page wraps content in `<main id="main-content" …>`; the shell provides
  `nav`, `aside`, `header`, `footer`; nested lists/tables use labelled regions
  (`aria-labelledby` on sections: e.g. `trick-method-heading`, `facts-heading`, `sequences-heading`).
- **Heading order** — one `h1` per page (login's is `#login-heading`; login's brand panel uses
  `<p>` for its strapline, one `h2` per capability). Sections use `h2`, nested cards `h3`/`h4`.
  One skip was found and fixed (§5): the Trick **Preview** tab had `h2 → h4`.
- **Keyboard path** — interactive controls are native buttons/links/inputs; the age-tier tabs
  implement a roving-tabindex tablist with Arrow/Home/End (`age-tier-tabs.tsx`); dialogs use
  Radix focus trap + Esc; icon-only buttons carry `aria-label`; targets are ≥24px (WCAG 2.5.8).
- **Visible focus** — global `:focus-visible` outline; sidebar override for the dark surface;
  sticky-bar clearance via `scroll-padding-bottom`/`scroll-margin-top`.
- **Labels / errors** — `FormField` renders `<label htmlFor>`, `aria-required`, `aria-invalid`,
  `aria-describedby`, and a `role="alert"` inline error; login mirrors this; validation moves
  focus to the first invalid field and reveals a hidden tab before focusing.
- **AA contrast** — §2.3; all text pairs in use pass after the §5 fix.
- **No color-only status** — every status is icon + text label + tint (`StatusBadge`,
  `CompletenessIndicator`, `DraftStatusView`, `family-type-badge`); AI-draft, vetting, review,
  missing-tier and publish-readiness states all carry text.
- **Reduced motion** — `@media (prefers-reduced-motion: reduce)` disables `animate-spin` and
  (added, §5) `animate-pulse`; shadcn dialog/sheet open/close animations are gated by the
  vendored base stylesheet.

## 4. UI gap dispositions (Phase 03b/03c/03d lows)

| Gap | Source | Disposition | Rationale / owner |
| --- | --- | --- | --- |
| **URL-synced tabs** | Phase 03d F-04 | **Re-accepted** | Optional deep-linking of the Trick editor tab / age-tier / preview selection. Drafts already persist to `localStorage` per entity and are restored on reload, so context is not lost. Implementing URL sync couples three client editors to `next/navigation` and requires a router-mock harness across ~10 component test files; that is disproportionate for a Low and would change browser-history behaviour. Owner: `studio-web` (accepted); no scheduled phase. |
| **Tooltip spans** | Phase 03d F-08 | **Re-accepted** | The status-strip trigger is a `tabIndex={0}` span so keyboard users can reach the help; Radix wires `aria-describedby` on focus, and every status is also conveyed by a visible label + badge text, so the tooltip is supplementary and never the sole signal. Phase 03d already accepted this pattern ("no action required"). Owner: `studio-web`. |
| **Compound-row lists** | Phase 03b B-02 | **Resolved** | The flat collections now use the `Table` primitive with `<caption class="sr-only">`: Worlds (`world-list.tsx`), Tricks (`trick-order-list.tsx`), Curricula (`curriculum-list.tsx`), Nitty Gritty Families (`family-list.tsx`). Remaining `<ul>/<ol>` are ordered/grouped lists where list semantics are correct (Sequences, assigned Trick roles, Facts, version history, comments, activity, publish-readiness checklist, breadcrumb trail). Minor: the tables do not apply a sticky header (short lists fit the viewport); accepted. Owner: `studio-web`. |

No gap is silently carried over.

## 5. Fixes applied in this phase

| Fix | File | Before → after |
| --- | --- | --- |
| Inactive tab label contrast (AA) | `src/components/ui/tabs.tsx` | `text-foreground/60` (4.32:1) → `text-muted-foreground` (5.44:1) |
| Reduced-motion for skeletons | `src/app/globals.css` | `prefers-reduced-motion` now also disables `animate-pulse` |
| Heading-order skip in Preview tab | `src/components/trick/preview-panel.tsx` | `<h4>` → `<h3>` under the Preview `h2` |
| Control-boundary non-text contrast (WCAG 1.4.11) | `src/app/globals.css`; `src/components/ui/{input,textarea,select,checkbox,switch,native-select}.tsx` | control boundary `#D7DDD8` (**1.38:1**) → new `border-input` token `#7C8A80` (**3.62:1** on surface, 3.37:1 on background, 3.25:1 on surface-muted) |

Each change is the smallest correct change; no behaviour, API contract, or server rule was
touched. The affected screens (Trick detail, World detail) were re-run through the
`web-design-guidelines` DESIGN → CODE → AUDIT → FIX loop at source level; the live re-audit was not
run: no running API + web pair with an authenticated session was exercised in this environment
(§2.5).

## 6. Changed paths (this phase)

- Added: `eslint.config.mjs`, `.prettierignore`, `tsconfig.base.json`, `openapi/openapi.yaml`,
  `openapi/README.md`, `.github/workflows/ci.yml`, `package-lock.json`, `docs/a11y-audit.md`,
  `docs/usability-session-protocol.md`, `scripts/check-contrast.mjs`.
- Changed: `package.json` (format scripts, prettier config, eslint devDeps, `check:contrast` script,
  `generate:api-types` path), `tsconfig.json` (self-contained `extends`), `src/app/globals.css`,
  `src/components/ui/tabs.tsx`, `src/components/trick/preview-panel.tsx`.
- Changed (D-058 control-boundary fix): `src/app/globals.css` (added `--border-input` /
  `--color-border-input`), `src/components/ui/input.tsx`, `textarea.tsx`, `select.tsx`
  (`SelectTrigger`), `checkbox.tsx` (base + `not-data-checked` boundary), `switch.tsx`
  (unchecked track fill), `native-select.tsx`. No component API, behaviour, or other visual
  property changed; no raw hex added to components.

## 7. Residual risk register

| Risk | Severity | Note |
| --- | --- | --- |
| ~~Input / border non-text contrast < 3:1 (WCAG 1.4.11)~~ | **Resolved (D-058)** | Control boundaries now use `border-input` `#7C8A80` (3.62:1 on `surface`) in `Input`/`Textarea`/`Select`/`Checkbox`/`Switch`/`NativeSelect` (§5). `border` (1.38:1) and `border-strong` (1.91:1) remain below 3:1 **by design** — decorative/structural separation only, never a control's sole boundary, so SC 1.4.11 does not apply. Token added to root `DESIGN.md` by the orchestrator. |
| Live browser + screen-reader verification of authenticated screens | Medium (process) | Not run: a database target now exists, but no running API + web pair with an authenticated session was exercised in this environment (the API has no deployed instance and no test admin session was established). All authenticated-screen rows are source/test judgements; a real-browser axe/Lighthouse pass per screen is a carry-forward. Owner: `studio-web` / QA, once a running authenticated API + web pair is available. |
| Cross-repo OpenAPI spec drift | Low | `studio-web/openapi/openapi.yaml` is a pinned copy of the canonical spec in `studio-api`. The web drift gate detects a stale generated client, not a stale copy; the API repo's own CI keeps the canonical spec honest. See `openapi/README.md`. Owner: `studio-web`. |
| Viewport visual verification (1280px / ~1024px) | Low (process) | No authenticated session (Phase 03d R-01 carry-forward). Owner: `studio-web`. |

## 8. Verdict

**No accessibility release blocker.** The login screen passes axe-core with zero violations and
Lighthouse accessibility 1.0. All design-token text pairs pass AA after one contrast fix; the
control-boundary non-text contrast finding is resolved by the `border-input` token (D-058, §5),
and the remaining `border`/`border-strong` values are below 3:1 by design because they are
decorative/structural and never a control's sole boundary. All authenticated-screen judgements
are source + test based and their live verification is explicitly outstanding: a database target
exists, but no running API + web pair with an authenticated session was exercised in this
environment (§1, §2.5) — this fix is a token/class-level change, so the authenticated screens
still need a real-browser re-audit once such a pair is running.
