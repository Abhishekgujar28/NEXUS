# NEXUS Frontend Redesign — Plan

Premium AI research product. Editorial + technical, dark-first, minimal, high density, subtle motion.
No rebuild. No backend/API changes. Reuse all existing hooks (`services.ts`, `stores/auth`, react-query, socket).

## 1. Information Architecture

Three surfaces:

- **Public** (`/` when guest): real landing page. Story arc — Idea → Research → Evidence → Gaps → Architecture → Roadmap.
- **Auth** (`/login`, `/register`): 50/50 split. Story/visual left, form right.
- **App** (authed): AI-first workspace.

App sidebar (replaces icon rail + topbar nav):
```
+ New Research      → composer / /new
Home                → research composer + starters (was Dashboard)
Discoveries         → cross-project feed of new sources/evidence/gaps
Library             → all projects, filter/search (reuses projects list)
Activity            → was /team (TeamActivityPage)
─ Projects          → live/recent project list
─ Pinned            → pinned projects (localStorage)
[user] · settings   → bottom, dropdown (existing logout/settings)
```

Project sub-nav — collapse 12 tabs → **5**:
```
Overview   → summary, one compact header, key metrics, next action
Research   → Sources + Evidence (+ live progress when running)
Insights   → Solutions + Gaps + Stress Test
Build      → Architecture + Resources + Roadmap
Copilot    → existing chat
```
Old tab routes kept as redirects into the grouped views (deep links survive).

## 2. Component / Layout Changes

- `AppLayout` — rewrite: persistent left sidebar (sections + pinned + user footer), remove separate topbar nav; keep ⌘K, keep CommandMenu. Add `AnimatePresence` route transitions in `<main>`.
- New `PublicLayout` + landing route gating in `App.tsx` (guest at `/` → landing, not redirect to login).
- `AuthLayout` — rewrite to 50/50 split shell; panels slot Login/Register forms.
- New `ProjectHeader` — single compact header (title, status, progress, primary action). Used once in `ProjectPage`; **removed from every tab**.
- New `ProjectNav` — 5-item segmented sub-nav.
- New shared: `motion.ts` (variants + `useReducedMotion` guard), `PageTransition`, `Stat`/`MetricRow` (inline, borderless), `LiveDot`, `SectionHeader` (eyebrow style), `PinButton`.
- Keep all `components/ui/*` primitives. Reduce card usage: prefer dividers, rows, and whitespace over nested cards. No card-inside-card.

## 3. Pages to Change / Create

Create:
- `pages/LandingPage.tsx` + section components (`landing/` — Hero, StorySteps, LiveResearchDemo, ArchitecturePreview, CTA).
- `features/project/ResearchView.tsx`, `InsightsView.tsx`, `BuildView.tsx` (compose existing tab bodies as sub-sections with internal segmented control — reuse SourcesTab/EvidenceTab/etc. content).
- `features/research/LiveActivity.tsx` — parallel Web/Papers/GitHub columns, live discoveries, stage progression (drives from `researchService.job` + socket).
- `pages/DiscoveriesPage.tsx`, `pages/LibraryPage.tsx`.

Change:
- `App.tsx` — routes: public landing, grouped project routes + legacy redirects.
- `AppLayout.tsx`, `AuthLayout.tsx`, `ProjectPage.tsx` (header + 5-nav), `DashboardPage.tsx` → **Home** (research composer "What are you building?" + starter actions + recent), `LoginPage/RegisterPage` (fit split), `NewProjectPage` (align with composer style).
- `OverviewTab` — trim to compact summary (no repeated title/description block).
- Existing tab files: keep logic, strip their internal page headers/duplicate project info; render as embedded sections.

## 4. Design System

- Tokens: keep existing HSL vars, citrine accent, Instrument Serif display, Inter, JetBrains Mono. Dark default.
- **Dark-first**: force `.dark` for app + landing; keep light for print/reports only.
- Type: large editorial display for landing/hero + section eyebrows; dense `sm`/`xs` in app. `tabular` for numbers.
- Restraint rules: minimal borders (hairline + dividers), no gradients-everywhere (one accent glow max per view), no repeated cards, differentiate sections by rhythm not identical boxes.
- Motion (Framer Motion, already installed): page fade/translate transitions, hover feedback, progress + live activity, command palette, sidebar expand, landing scroll storytelling. All gated by `prefers-reduced-motion` via `useReducedMotion`.
- Add tokens as needed: `mono-label`, subtle grid/scanline bg for landing, `live` pulse (reuse `accent-pulse`).

## 5. Implementation Order

1. Foundations: `motion.ts`, `PageTransition`, `ProjectHeader`, `ProjectNav`, shared bits.
2. `AppLayout` sidebar (Home/Discoveries/Library/Activity/Projects/Pinned/user).
3. `ProjectPage` — compact header + 5 grouped views; add legacy redirects; strip per-tab headers.
4. Home (research composer) + Library + Discoveries.
5. Research live activity (parallel streams, discoveries, stages).
6. Auth 50/50 split (`AuthLayout`, Login, Register).
7. Public landing page + scroll storytelling.
8. Motion polish, reduced-motion pass, typecheck (`npm run typecheck`), route/deep-link verification.

Constraint: preserve all existing functionality and data hooks; visual/IA change only.
