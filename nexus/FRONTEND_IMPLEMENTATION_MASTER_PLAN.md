# NEXUS — Frontend Implementation Master Plan

**Document type:** Product & Engineering Audit + Implementation Roadmap
**Scope:** Make the NEXUS frontend a complete, faithful representation of what the backend actually does — no fake data, no redesign, no invented features.
**Author role:** Principal Architect / Staff Frontend / Staff Backend / Product / UX (consolidated audit)
**Date:** 2026-08-01
**Ground truth:** The *actual* source code in `nexus/frontend` and `nexus/server`. Where the code disagrees with `server/docs/ARCHITECTURE.md` or `server/docs/IMPLEMENTATION_PLAN.md`, **the code wins**. Those two docs describe an *intended* design that has diverged from the shipped implementation and must not be treated as authoritative.

---

## How to read this document

This plan is deliberately exhaustive. It is organized so you can either read it front-to-back to understand the whole system, or jump straight to the prioritized backlog (Section 13) and the page-by-page roadmap (Section 11) to start executing.

The guiding rule throughout: **the frontend must only show what the backend can truly produce.** Every recommendation below is one of exactly three kinds, and each is tagged so intent is never ambiguous:

- **`[WIRE]`** — the backend capability exists but the frontend never calls it (or calls it wrong). Connect it.
- **`[REMOVE-FAKE]`** — the frontend shows hardcoded/mock/placeholder data as if it were real. Remove it or replace it with real data.
- **`[FIX]`** — a real bug: broken URL, dead button, routing error, missing state, authorization hole.

A fourth tag, **`[BACKEND-GAP]`**, marks places where the *right* fix is a backend change (the frontend is honestly reflecting that the backend can't do the thing yet). These are called out but sequenced carefully so frontend work is never blocked waiting on them.

No recommendation in this document invents a feature, fabricates a statistic, or asks you to redesign the existing NEXUS visual language. Branding, theme, color system (citrine / moss / amber on dark), and typography stay exactly as they are.

---

## Table of contents

1. Executive summary
2. What NEXUS is — the product, honestly described
3. System architecture as actually built
4. Backend capability map (the source of truth)
5. Frontend implementation map (what exists today)
6. The API surface: defined vs. consumed
7. The Socket.IO layer: emitted vs. consumed
8. Integration audit — unused capabilities & broken wiring
9. Fake / mock / dead-code inventory (the honesty ledger)
10. UX audit (improve-in-place, no redesign)
11. Page-by-page implementation plan
12. Cross-cutting subsystems (Landing, Auth, Dashboard, Architecture, Build, Export, Sockets, Notifications)
13. Prioritized backlog
14. Implementation phases & sequencing
15. File-level change map
16. Verification & acceptance criteria
17. Appendix: endpoint / event / query-key reference tables

---

## 1. Executive summary

NEXUS is a research-and-innovation copilot. A user describes a project idea; a backend multi-agent pipeline researches it across many external sources, extracts evidence, finds existing solutions, identifies innovation gaps, stress-tests assumptions, proposes an architecture and a roadmap, and exposes a grounded chat copilot over the whole corpus. The backend that does this is genuinely substantial: a task-routed multi-provider AI layer, an 8-agent research orchestrator with 11 pipeline stages, a RAG store with embeddings and reranking, real research providers (Serper, GitHub, arXiv, Semantic Scholar), a report/export engine, and a Socket.IO progress channel.

The frontend is well-crafted visually and its core CRUD-plus-research flows are wired correctly: authentication, project creation, the project list, the research getters (sources / evidence / solutions / gaps / architecture text / resources / roadmap), and the project-scoped copilot all call real endpoints and render real data with proper loading and empty states. That foundation is solid and should not be disturbed.

The gap the user has correctly sensed is this: **a meaningful slice of the frontend presents fabricated content as if it were product output, and several real backend capabilities are never surfaced at all.** The most important single finding is that the **Architecture page — described in the brief as one of the strongest features — does not render a real diagram at all.** There is no Mermaid library installed; the "MermaidViewer" prints a hardcoded, project-agnostic NEXUS-internal graph as plain text, and its seven diagram-type tabs are decorative toggles that change nothing. Alongside this, the landing page is entirely mock (fake evidence, fake statistics, a fictional CLI/IDE/CI ecosystem that does not exist), the global floating Copilot returns a canned `setTimeout` reply instead of calling the real copilot endpoint, the Overview tab shows three invented metric cards (feasibility 88.5, quality 92%, cost ₹12,000/mo), the Notification tray is hardcoded and not even mounted, the Settings page is entirely static with dead Save/Delete buttons, and the Export modal's URL is double-prefixed so every export 404s.

None of these are hard to fix. They are, overwhelmingly, *disconnection* and *honesty* problems rather than missing-engineering problems. The plan below sequences the work so the highest-impact truth-restoring fixes (Architecture diagram, Export URL, Copilot unification, removing invented metrics) land first, followed by wiring the genuinely-available-but-unused backend capabilities, followed by the smaller correctness and UX-polish items.

A blunt one-line framing for stakeholders: **NEXUS is roughly 70% a real product and 30% a convincing demo skin — and the plan is to convert the demo skin into either real wiring or honest absence, without touching the parts that already work.**

---

## 2. What NEXUS is — the product, honestly described

### 2.1 The core loop

NEXUS turns an idea into an evidence-backed execution plan. The intended user journey, and the one the backend genuinely supports, is:

1. **Describe** — the user creates a project with a title, a description, and optional structured context (domain, project type, platform, target users, preferred tech, timeline, team size, skill level, constraints).
2. **Research** — the user starts a research run. A background worker executes an 11-stage pipeline: understand the problem, plan queries, search the web / papers / repos, analyze results, extract existing solutions, find innovation gaps, stress-test assumptions, design an architecture, and produce a roadmap.
3. **Review evidence** — the user browses sources, evidence claims (with confidence and supporting/contradicting source links), existing solutions, and innovation gaps.
4. **Decide** — the user reads the proposed architecture (overview, components, data flow, technology recommendations with rationale/alternatives/tradeoffs), the resource recommendations, and the phased roadmap with risks.
5. **Execute** — the user works from the roadmap toward a build.
6. **Ask** — throughout, a project-scoped copilot answers questions grounded in the project's own research corpus, returning citations.

Everything in steps 1–4 and 6 is real and backed by working endpoints. Step 5 ("Build") is where the product's ambition currently outruns the backend: the Build tab is aspirational UI with no build backend behind it.

### 2.2 Who it's for

The frontend's language ("Research & Innovation Copilot", "Idea → Evidence → Decision → Execution") targets technical founders, engineers, and researchers who want rigor — cited evidence, explicit assumptions, named tradeoffs — rather than a generic chatbot's confident prose. This audience is *unusually intolerant of fabricated numbers*, which is exactly why the current mock statistics are a product liability, not just a polish issue. A researcher who sees "Verification confidence: 98.4%" on the landing page and then discovers it is a static string will distrust every real number in the app. Restoring honesty is therefore a trust-critical product requirement, not a nicety.

### 2.3 The product's real differentiators (what to protect)

Three things make NEXUS genuinely distinctive, and all three are real in the backend and must be showcased *accurately*:

The **multi-agent research pipeline** is real: eight specialized agents plus a copilot agent, orchestrated across 11 stages with per-stage progress. The **grounded copilot** is real: it retrieves from the project's own indexed corpus and returns structured citations. And the **decision artifacts** — evidence claims with support/contradiction, explicit assumptions with severity, architecture with named tradeoffs, roadmap with risks — are real structured outputs, not prose. The plan protects these by wiring them fully and truthfully, and by *removing* the fake veneer that currently competes with them for the user's attention.

---

## 3. System architecture as actually built

### 3.1 Backend stack (verified in code)

The server is Node.js + Express + TypeScript with MongoDB/Mongoose for persistence, Redis for locking and BullMQ queueing, and Socket.IO for realtime. Authentication is JWT-based: a 15-minute access token plus a 7-day refresh token, with the refresh token persisted on the `User.refreshToken` field. Tokens travel as bearer tokens in JSON request/response bodies — **not** as httpOnly cookies — which the frontend correctly mirrors by storing them in `localStorage` and attaching an `Authorization: Bearer` header. Request validation is via Zod; the app uses helmet, CORS, and rate limiting, and outbound fetches go through an SSRF-safe wrapper.

The AI layer is a task-routed multi-provider router (`AIRouter`) supporting seven providers (OpenRouter, Gemini, OpenAI, Anthropic, Groq, DeepSeek, Together). A `TASK_MODEL_REGISTRY` maps logical tasks (research, copilot, architecture, summarization, fast_classification, default) to ordered model/provider fallback chains, with retry/backoff, and every call is logged to an `AIUsageLog` collection capturing token and cost telemetry. This telemetry is real and is currently **never surfaced in the frontend** — an opportunity noted later.

The research pipeline is a `ResearchOrchestrator` driving eight agents (ProblemUnderstanding, QueryPlanner, DeepSearch, ResearchAnalysis, GapFinder, Critic, Architect, Roadmap) plus a Copilot agent, across 11 stages: `understand`, `plan`, `search_web`, `search_papers`, `search_github`, `analyze`, `solutions`, `gaps`, `stress`, `architecture`, `roadmap`. Research providers actually wired are Serper (web), GitHub, arXiv, and Semantic Scholar; several more providers are imported but unused.

RAG uses a ~1200-character chunker with 150-character overlap, Gemini `text-embedding-004` embeddings, and a vector store that defaults to an in-memory implementation (Chroma optional). Retrieval reranks with `0.7 * cosine + 0.3 * keyword`, returns top-K 8, and yields citations shaped `{ index, title, url, sourceType }`.

### 3.2 Notable backend realities the frontend must respect

Several backend facts directly constrain what the frontend can honestly display. The **diagram engine** (a Kroki-based renderer supporting seven diagram types) exists in the codebase but is **orphaned** — nothing calls it, and the architecture endpoint returns *text only* (overview, components, dataFlow, deploymentModel, scalabilityNotes), with **no diagram source and no rendered diagram**. The **export engine** produces real Markdown, HTML, and JSON, but PDF and DOCX are stubs. The **circuit breaker** and **cache** modules are fully implemented but **not wired** into any request path (dead infrastructure). **Cancellation** of a research job is not functionally implemented. **Notification emission** is effectively dead. The **resources** endpoint currently returns empty. The **stress test** endpoint is a stub (the genuinely useful critic output lives in `job.metadata.critique`). And the `research:progress` socket event fires rarely, so realtime progress in practice depends on polling.

These are the hard edges the frontend must be built around. The plan never asks the frontend to pretend any of these gaps don't exist.

### 3.3 Frontend stack (verified in `package.json`)

React 18 + Vite 8 + TypeScript, TanStack Query v5 for server state, Zustand v5 for client state, React Router v6, Radix UI primitives, Tailwind, `socket.io-client`, `framer-motion`, `sonner` for toasts, `cmdk` for a command palette, `react-hook-form` + `zod`, `date-fns`, `lucide-react` icons. **Critically, there is no `mermaid` package and no diagram-rendering library of any kind** — a fact that single-handedly explains why the flagship Architecture visualization is fake.

---

## 4. Backend capability map (the source of truth)

This section enumerates what the backend can actually do, endpoint by endpoint, so that every frontend claim later in the document can be checked against it. Each capability is marked with a **surfacing status**: `SURFACED` (frontend uses it correctly), `PARTIAL` (used but incompletely or incorrectly), `UNSURFACED` (backend has it, frontend never calls it), or `STUB/EMPTY` (endpoint exists but backend returns nothing useful yet).

### 4.1 Authentication (`/api/v1/auth`)

| Endpoint | Method | Purpose | Surfacing |
|---|---|---|---|
| `/auth/register` | POST | Create user, return user + access/refresh tokens | SURFACED |
| `/auth/login` | POST | Authenticate, return user + tokens | SURFACED |
| `/auth/logout` | POST | Invalidate refresh token | SURFACED |
| `/auth/me` | GET | Return current user from access token | SURFACED |
| `/auth/refresh` | POST | Exchange refresh token for new access token | SURFACED (interceptor only) |

Auth is the most completely and correctly wired area of the product. The access/refresh lifecycle, the request interceptor that attaches the bearer token, and the response interceptor that transparently refreshes on a 401 (skipping `/auth/` URLs to avoid loops) are all present and correct. There is no password-reset endpoint on the backend, which is why the login page's "Forgot?" affordance has nothing to call.

### 4.2 Projects (`/api/v1/projects`)

| Endpoint | Method | Purpose | Surfacing |
|---|---|---|---|
| `/projects` | GET | List projects (paginated, filter by status) | SURFACED |
| `/projects/:id` | GET | Get one project (incl. `problemUnderstanding`) | SURFACED |
| `/projects` | POST | Create project | SURFACED |
| `/projects/:id` | PUT | Update project | UNSURFACED |
| `/projects/:id` | DELETE | Delete project | UNSURFACED |
| `/projects/:id/stats` | GET | Aggregate counts (sources/solutions/gaps/etc.) | PARTIAL |
| `/projects/:id/members` | POST | Add a member | UNSURFACED |
| `/projects/:id/members/:userId` | DELETE | Remove a member | UNSURFACED |

The list/get/create paths are fully wired and drive the Dashboard, Library, Discoveries, and project workspace. **Update and delete are never called from anywhere in the UI** — there is no way for a user to rename, edit, or delete a project despite the endpoints existing. The stats endpoint is called by the Overview tab but the UI mixes its real numbers with three invented metric cards. The member endpoints exist but the Team page shows only the current user plus a "coming soon" notice and never calls them.

### 4.3 Research (`/api/v1/research`)

| Endpoint | Method | Purpose | Surfacing |
|---|---|---|---|
| `/research/:id/start` | POST | Enqueue a research run | SURFACED |
| `/research/:id/job` | GET | Get job status + stages + progress + metadata | PARTIAL |
| `/research/:id/sources` | GET | List gathered sources | SURFACED |
| `/research/:id/evidence` | GET | List evidence claims | PARTIAL |
| `/research/:id/solutions` | GET | List existing solutions | PARTIAL |
| `/research/:id/gaps` | GET | List innovation gaps | PARTIAL |
| `/research/:id/architecture` | GET | Architecture text + recommendations | PARTIAL |
| `/research/:id/resources` | GET | Resource recommendations | STUB/EMPTY |
| `/research/:id/roadmap` | GET | Phased roadmap with tasks & risks | SURFACED |
| `/research/:id/stresstest` | POST | (stub) trigger stress test | STUB/EMPTY |

Most research getters are wired and render real data. The important nuances: the **job** endpoint returns `metadata.critique` (the real Critic output) which the frontend never reads; **evidence/solutions/gaps** carry score fields the backend does not populate, which the UI sometimes renders as "0%"; **architecture** returns text only and the frontend fabricates a diagram on top of it; **resources** returns empty so the Resources tab and Build tab have thin/absent data; and **stresstest** is a stub whose "Run" button produces no visible change.

### 4.4 Copilot (`/api/v1/copilot`)

| Endpoint | Method | Purpose | Surfacing |
|---|---|---|---|
| `/copilot/:id/chat` | POST | Ask a grounded question, return answer + citations | PARTIAL |
| `/copilot/:id/history` | GET | Conversation history | SURFACED |

The project-scoped `CopilotTab` calls both endpoints over HTTP (request/response, **not** streaming) and works. Two gaps: the returned **citations are fetched but never rendered**, and the **global floating copilot is a mock** that never calls these endpoints at all.

### 4.5 Export (`/api/v1/export`)

| Endpoint | Method | Purpose | Surfacing |
|---|---|---|---|
| `/export/:id/:format` | GET | Generate/download report in a format | FIX-NEEDED |

Backend produces real `markdown`, `html`, and `json`; `pdf` and `docx` are stubs. Artifacts have a 24-hour TTL (`ExportArtifact`). The frontend modal offers all five formats but its request URL is **double-prefixed** (`/api/v1/api/v1/export/...`) so it 404s for every format regardless.

### 4.6 System (`/api/v1/system`)

| Endpoint | Method | Purpose | Surfacing |
|---|---|---|---|
| `/system/providers` | GET | AI provider availability/config | UNSURFACED |
| `/system/ai-config` | GET | Task→model routing config | UNSURFACED |

These exist and expose genuinely interesting operational data (which providers are online, how tasks route to models). **Two problems:** the frontend never calls them, and — per the backend audit — the routes are **not authentication-gated**, which is a security finding (see §8.4). The Settings page, which is the natural home for this information, is entirely static.

### 4.7 Notifications

Notification **emission is effectively dead** on the backend (the `notification:new` socket event and any `/notifications` REST surface are not meaningfully producing data). The frontend `NotificationTray` is correspondingly a hardcoded mock — and is not even mounted. This is a `[BACKEND-GAP]`: the honest frontend state is *no notification UI* until the backend produces real notifications.

### 4.8 Realtime (Socket.IO)

The server emits (or is designed to emit) `research:progress`, `research:complete`, `research:failed`, `research:queue_status`, and `notification:new`, scoped to `project:<id>` rooms joined via `project:join`. In practice `research:progress` fires rarely and `notification:new` does not fire meaningfully. The frontend listens only to `research:progress` / `research:complete` / `research:failed`. See §7 for the full matrix.

### 4.9 Dead / unwired backend infrastructure

For completeness, these backend modules are implemented but wired to nothing, and therefore must **not** be represented in the frontend as working features: the **Kroki diagram engine** (7 types), the **circuit breaker**, the **cache** layer, functional **job cancellation**, and **PDF/DOCX** export rendering. Any frontend UI implying these work is fake by definition.

---

## 5. Frontend implementation map (what exists today)

This is the inventory of the shipped frontend, grouped by area, with each unit's real data source and its honesty status.

### 5.1 Application shell & routing

`App.tsx` sets up a TanStack Query client (30s stale time, `retry: 1`, no refetch on focus), a Radix tooltip provider, and React Router. Public route `/` renders the landing page. `GuestRoute + AuthLayout` wraps `/login` and `/register`. `ProtectedRoute + AppLayout` wraps `/app` (Dashboard), `/discoveries`, `/library`, `/new`, `/projects/:projectId/*`, `/team`, `/settings`. Unknown routes redirect to `/`. Route gating reads `useAuthStore.status` (`idle | loading | guest | authed`) and shows a spinner while resolving. This is correct and should not change, with one small exception noted for the command-palette "Dashboard" target.

`AppLayout` is the real signed-in shell: a fixed 240px sidebar plus a scrollable main column. It lists projects via query key `['projects','sidebar']` (`projectsService.list({ limit: 40 })`) with **smart polling** — a 5000ms `refetchInterval` that engages only while some project is `researching`. It mounts the command palettes, the floating copilot, and — importantly — it **imports `NotificationTray` but never renders it**. `AuthLayout` is a static centered card with the NEXUS wordmark and tagline.

### 5.2 Stores

`stores/auth.ts` (Zustand + persist) is real and correctly wired to the auth service. `stores/pinned.ts` is a deprecated shim re-exporting the pin helpers from `components/PinButton`. `stores/copilot.ts` is a non-persisted client buffer that **seeds a hardcoded welcome message** and holds the floating copilot's fake conversation.

### 5.3 Pages

The **Dashboard** (`['projects']`), **Library** (`['projects','library',status]` with client-side text search), **Discoveries** (`['projects','discoveries']` + first project's `['sources']` and `['gaps']`), and **New Project** (create mutation) are all real-data pages with appropriate loading, empty, and (mostly) error states. The **Team Activity** page synthesizes an activity feed client-side from project timestamps (no activity endpoint exists) and shows only the current user as a "member." The **Settings** page is entirely static with two dead buttons. The **Landing** page is 100% mock across seven viewports.

### 5.4 Project workspace

`ProjectPage` is the workspace shell with an **inline 12-tab navigation** and matching nested routes: Overview, Research, Sources, Evidence, Solutions, Gaps, Stress, Architecture, Resources, Roadmap, Build, Copilot. Eleven of the twelve map to a real endpoint; **Build** has no backend. The workspace mounts `useResearchSocket` for cache invalidation and drives progress primarily through polling.

Crucially, there exist **two entirely abandoned alternative navigation architectures** shipped as dead code: `features/project/{ProjectNav, ProjectHeader, ResearchView, InsightsView, BuildView}` and `components/project/{ProjectNav, ProjectHeader}`. None are imported. The live UI is the inline 12-tab bar only.

### 5.5 Feature tabs (project)

Sources, Evidence, Solutions, Gaps, Roadmap, and the project Copilot render real backend data with proper states. Overview mixes real stats with three invented metric cards. Architecture renders real text but a fake diagram. Resources is thin (backend returns empty). Stress reads `problemUnderstanding.assumptions` (real when populated) but its "Run" button hits a stub and it ignores the real `metadata.critique`. Build is aspirational: session-only task state plus a hardcoded project blueprint.

### 5.6 Components

Real, generic UI primitives live in `components/ui/*` (button, input, badge, card, skeleton, progress, dialog, tabs, tooltip, dropdown, avatar, toaster, empty-state, scroll-area, section) — all clean, no mock data. `MermaidViewer` is a placeholder that prints diagram source as text. `ExportCenterModal` has a broken URL. `NotificationTray` is a hardcoded mock. `CopilotChatWindow` is a hardcoded mock. There are two command palettes (`CommandMenu` via cmdk and `CommandPaletteModal`) both bound to ⌘K, causing a shortcut conflict. Landing components (`landing/*`, plus the unused `Hero`/`ResearchViz`) are all mock.

---

## 6. The API surface: defined vs. consumed

The frontend service layer (`lib/services.ts`) is the complete set of backend endpoints the app knows how to call. Comparing it against actual call sites yields three buckets.

**Defined and consumed correctly:** all four auth methods; `projects.list`, `projects.get`, `projects.create`; `research.start`, `.job`, `.sources`, `.evidence`, `.solutions`, `.gaps`, `.architecture`, `.roadmap`, `.resources`, `.stresstest`; `copilot.chat`, `copilot.history`.

**Defined but never called anywhere:** `projects.update`, `projects.remove`, `projects.stats` (called, but its output is diluted by fake cards), `projects.addMember`, `projects.removeMember`. So the service layer knows how to edit, delete, and share projects, but no screen exposes those actions.

**Backend endpoints with no service function at all** (the frontend cannot even call them): everything under `/system` (`/providers`, `/ai-config`), the `/export/:id/:format` path (the modal bypasses the service layer with a raw — and broken — axios call), any AI-usage/telemetry read, and any notifications read. These are the true blind spots: capabilities the frontend has no vocabulary for.

The remediation pattern is uniform: add typed service functions for `/system` and export, wire the already-defined-but-unused project mutation methods into real UI affordances, and delete the raw axios call in the export modal in favor of a service function with the correct (single) `/api/v1` prefix.

---

## 7. The Socket.IO layer: emitted vs. consumed

`lib/socket.ts` maintains a lazy singleton connection authenticated with the access token, joins and leaves `project:<id>` rooms, and re-joins the active room on reconnect. `hooks/useResearchSocket.ts` is the only real consumer.

| Event | Backend emits? | Frontend listens? | Effect in UI |
|---|---|---|---|
| `research:progress` | Rarely (in practice) | Yes | Invalidates job/project/projects queries |
| `research:complete` | Yes | Yes | Success toast + broad invalidation |
| `research:failed` | Yes | Yes | Error toast + invalidation |
| `research:queue_status` | Designed to | **No** | — (queue banner uses hardcoded values instead) |
| `notification:new` | Not meaningfully | **No** | — (tray is hardcoded) |

Two takeaways. First, because `research:progress` fires rarely, **realtime progress is effectively driven by polling** (`ResearchProgressTab` refetches the job every 3s while running). This is a reasonable, robust design — the socket layer is a bonus, not the backbone — and the plan keeps polling as the source of truth while making the socket purely additive. Second, the `research:queue_status` event is emitted but ignored; the `QueueStatusBanner` instead displays a **hardcoded "Position #1, Est. wait 2m 0s."** That is fake data with a real event available to replace it — a clean `[WIRE]` + `[REMOVE-FAKE]` pairing.

---

## 8. Integration audit — unused capabilities & broken wiring

This is the heart of the cross-reference: every place where the two sides fail to meet. Findings are grouped by kind.

### 8.1 Real backend capabilities the frontend never surfaces (`[WIRE]`)

The following work on the backend but have no honest representation in the UI. Each is an opportunity to make the product *more* real without inventing anything.

**Project edit & delete.** `projects.update` and `projects.remove` are defined and functional, but there is no rename/edit form and no delete affordance anywhere. Users cannot correct a typo in a project title or remove a failed project. This is the highest-value pure-wiring gap because it closes an obvious CRUD hole.

**Provider & AI-routing visibility.** `/system/providers` and `/system/ai-config` expose which AI providers are online and how tasks route to models. For NEXUS's technical audience this is genuinely compelling operational transparency and belongs on the Settings page (read-only). Currently unreachable — no service function exists.

**AI usage / cost telemetry.** The backend logs tokens and cost per call to `AIUsageLog`. There is no read endpoint surfaced and no UI. If a read endpoint is exposed (small `[BACKEND-GAP]`), a per-project "research cost" figure would *replace* the invented "₹12,000/mo" card with a real number.

**The Critic's output.** Every research job stores `metadata.critique` — the real stress-test/critique content. The Stress tab ignores it entirely and instead re-reads `problemUnderstanding.assumptions` and offers a "Run" button against a stub. Surfacing `metadata.critique` turns the Stress tab from near-dead into genuinely useful with zero backend work.

**Queue status.** The `research:queue_status` socket event exists; the queue banner shows hardcoded numbers. Wire the event; hide the banner when there is no queue data.

**Copilot citations.** `copilot.chat` returns a `citations[]` array that the UI fetches and then discards. Rendering them delivers the product's central "grounded answers" promise.

### 8.2 Broken wiring (`[FIX]`)

**Export URL double-prefix.** `ExportCenterModal` calls `api.get('/api/v1/export/...')` while the axios `baseURL` is already `.../api/v1`, producing `/api/v1/api/v1/export/:id/:format` — a guaranteed 404 for every format. Additionally the modal advertises `pdf` and `docx`, which are backend stubs. Fix the URL and either hide pdf/docx or badge them as unavailable.

**Command palette "Dashboard" mis-navigation.** `CommandMenu`'s Dashboard command navigates to `/` (landing) instead of `/app`. A signed-in user selecting "Dashboard" is bounced to the marketing page.

**Duplicate ⌘K binding.** Both `CommandMenu` and `CommandPaletteModal` are mounted and bound to ⌘K/Ctrl+K, so the shortcut toggles both, and the sidebar search button (which fakes a ⌘K keypress) opens an ambiguous result. Keep one palette; remove the other.

**NotificationTray never rendered.** It is imported in `AppLayout` but absent from the JSX, so the bell UI does not appear at all. Given the backend produces no real notifications, the correct resolution is to *remove* the mock rather than render it (see §9).

### 8.3 Fake data presented as product output (`[REMOVE-FAKE]`)

Enumerated fully in §9. The integration-relevant point: none of these have a real backend source today, so the remediation is removal or honest empty-state, **not** wiring — except the two that *do* have a real source (queue status via socket, and the Overview cost card if a telemetry read is exposed).

### 8.4 Authorization & security findings

**Unauthenticated `/system` routes.** The backend audit found `/system/providers` and `/system/ai-config` are not authentication-gated. Before the frontend surfaces them on Settings, the backend must require auth on these routes, otherwise the frontend would be advertising an unauthenticated information-disclosure endpoint. Marked `[BACKEND-GAP]` and sequenced as a prerequisite to the Settings wiring.

**Member/authorization model.** The project member endpoints exist but the frontend has no sharing UI and the Team page implies collaboration that isn't wired. No privilege-escalation risk in the frontend today (it simply never calls them), but any future sharing UI must respect the backend's owner/editor/viewer roles.

### 8.5 Routing, loading, and correctness gaps

New Project's Cancel navigates to `/` (landing) rather than `/app`. Discoveries has no per-section empty state (a project with no sources/gaps silently renders blank) and no error handling on its source/gaps queries. The project Copilot's send `onError` only `console.error`s — a failed message silently vanishes with no user feedback. These are small, isolated `[FIX]` items.

---

## 9. Fake / mock / dead-code inventory (the honesty ledger)

This is the definitive list of everything currently presented to users as real that is not. It is the single most important section for the user's stated intent ("no fake data"). Each entry names the file, what is fake, and the honest resolution.

### 9.1 The landing page (entirely mock)

All seven landing viewports are hardcoded marketing fiction. `ViewportBoot` shows a decorative node canvas with invented labels ("Raft Protocol", "RFC 7540") and a non-functional search bar. `ViewportEvidence` shows four fabricated papers with fake confidence scores (0.88–0.97) and fake aggregate statistics ("412 papers cross-referenced", "14 bottlenecks flagged", "Verification confidence: 98.4%"). `ViewportArchitecture` shows a fake "4 layers · 12 components · zero drift" caption. `ViewportWorkspace` shows a fake in-app preview with invented counts (Sources 23, Evidence 47, Solutions 12, Gaps 5). `ViewportDeveloper` advertises a **CLI, VS Code extension, and GitHub Action that do not exist** (`nexus verify`, `nexus-engine/verify-action@v2`). `ViewportInitialize` has a dead email field and dead footer links. `Hero.tsx` and `ResearchViz.tsx` are unused dead components.

**Honest resolution:** A landing page is allowed to be aspirational marketing — but per the user's constraint against fake data and fake statistics, the *specific fabricated numbers and the fictional developer ecosystem must go*. The resolution (detailed in §12.1) keeps the visual language and section structure but replaces invented statistics with either real aggregate numbers (if a public stats endpoint is exposed) or qualitative copy, and removes the CLI/IDE/CI section entirely since those products do not exist.

### 9.2 Overview tab — three invented metric cards

`OverviewTab` renders "Feasibility Index 88.5 / 100", "Quality & Security Score 92% / 0 critical vulnerabilities", and "Estimated Cloud & Token Cost ₹12,000 / mo" as hardcoded literals for **every** project. **Honest resolution:** remove all three. The cost card *may* later be replaced by a real figure from `AIUsageLog` if a read endpoint is exposed; the feasibility and quality indices have no backing data and must simply be deleted.

### 9.3 Architecture tab — fake diagram (flagship issue)

`ArchitectureTab` passes a hardcoded `graph TD; A[Client Request] --> B[API Gateway]...` string to `MermaidViewer`, gated only on `arch.dataFlow` being non-empty — the same canned NEXUS-internal graph for every project. `MermaidViewer` cannot render it anyway (no mermaid library) and prints it as `<pre>` text; its seven diagram-type tabs are decorative no-ops. **Honest resolution** (full detail in §12.4): install a real diagram library, generate the diagram *from the project's real `architecture.components` and `dataFlow`*, and either make the type tabs real or reduce to the views actually derivable from the data.

### 9.4 Global floating copilot — canned reply

`CopilotChatWindow` never calls the backend; `handleSend` appends a hardcoded reply after an 800ms `setTimeout`. **Honest resolution:** unify on the real `copilotService` (which the project `CopilotTab` already uses correctly), or, if a global copilot has no project context to ground against, remove the floating copilot outside project pages.

### 9.5 Notification tray — hardcoded, unmounted

`NotificationTray` seeds two fake notifications and never calls an endpoint or listens to a socket; it is also not rendered. **Honest resolution:** remove it until the backend produces real notifications (`[BACKEND-GAP]`).

### 9.6 Queue status banner — hardcoded position/wait

`QueueStatusBanner` is fed `queuePosition={1}` and `estimatedWaitTimeSeconds={120}` as literals. **Honest resolution:** wire to the real `research:queue_status` event; hide when absent.

### 9.7 Pipeline stepper — static stage list

`PipelineStepper` renders an internal hardcoded 11-stage list rather than the job's actual `stages`, and forces all steps to "done" at `progress === 100`. **Honest resolution:** drive labels/order from `job.stages` so drift can't desync the display.

### 9.8 Build tab — aspirational, session-only, hardcoded blueprint

`BuildModeTab` flattens roadmap tasks into a checklist whose completion state is `useState` (lost on refresh), and renders a 100% hardcoded "Project Blueprint & Specifications" card (fixed folder tree, fake API/DB contracts, fixed tech stack describing NEXUS itself). **Honest resolution:** remove the hardcoded blueprint; keep the roadmap-derived checklist but clearly label it as a local, unsaved working view until a backend tasks endpoint exists (`[BACKEND-GAP]`).

### 9.9 Team activity — synthesized feed & phantom members

`TeamActivityPage` fabricates an activity feed from project timestamps (attributing everything to the current user) and shows only the current user under "Members" with a "coming soon" notice. **Honest resolution:** relabel the feed honestly as "recent project updates" (since that's what the timestamps actually represent) and remove the members section until member listing is wired, or wire it to the real member endpoints if a list endpoint is added.

### 9.10 Score fields rendered as "0%"

`GapsTab` always renders `gap.confidence` (backend leaves it unpopulated → "0%") and sorts by it; `EvidenceTab` always shows `confidence` (→ "0%" when unpopulated). Type fields `evidenceScore`, `credibilityScore`, `sourceIds`, `evidenceSourceIds` are defined but never populated/rendered. **Honest resolution:** hide score chips when the value is absent/zero rather than displaying a misleading "0%".

### 9.11 Dead navigation architectures

`features/project/{ProjectNav, ProjectHeader, ResearchView, InsightsView, BuildView}` and `components/project/{ProjectNav, ProjectHeader}` are all unused. **Honest resolution:** delete the abandoned set once the 12-tab model is confirmed as the intended IA.

### 9.12 Miscellaneous dead affordances

Settings "Save changes" and "Delete account" (no handlers, no endpoints), Login "Forgot?" (no reset endpoint), the landing email capture, and the deprecated `stores/pinned.ts` and `shared/PinButton.tsx` shims. **Honest resolution:** wire the ones with a backend path (Delete account → `projects`/user delete only if a user-delete endpoint exists; otherwise remove), and remove the ones without.

---

## 10. UX audit (improve-in-place, no redesign)

The brief is explicit: no redesign, keep the NEXUS visual language, improve only where required. This section respects that boundary. Every item here is a *targeted* improvement to an existing screen — better states, clearer hierarchy, honest content — not a reimagining.

### 10.1 Consistency of empty and error states

The app is inconsistent about the "no data yet" moment. Dashboard, Library, and the strong research tabs handle loading/empty/error well; Discoveries silently renders blank sections, the project Copilot swallows send errors, and several tabs assume populated score fields. The single highest-leverage UX theme is **state consistency**: every list should have a skeleton while loading, a purposeful empty state when genuinely empty, and a visible (toast or inline) error when a query fails. Because the primitives already exist (`EmptyState`, `ErrorState`, `Skeleton`, `sonner`), this is applying existing components, not designing new ones.

### 10.2 Honesty as a UX principle

For NEXUS's audience, a truthful "not available yet" is a *better* experience than a fabricated number. Wherever §9 calls for removing fake data, the replacement is either a real value or a calm empty state ("No cost data yet — run research to populate"), never a blank hole. This keeps the interface feeling finished while making it honest.

### 10.3 Landing page layout coherence

The landing viewports use inconsistent max-widths (`max-w-2xl` through `max-w-5xl`) against a `max-w-5xl` header, so content columns visibly jump width between sections, and every section is `py-24 sm:py-32` (very tall), producing excessive whitespace and a long scroll. Improve-in-place: standardize on a single content max-width and a slightly tighter vertical rhythm. No new sections, no new visual language.

### 10.4 Progress legibility

Research progress is the product's signature moment and it works (polling-driven), but the stepper's static stage list and the fake queue banner undercut trust. Driving the stepper from real `job.stages` and replacing the fake banner with real queue data (or hiding it) makes the most-watched screen trustworthy.

### 10.5 Navigation clarity

The 12-tab project bar is functional but flat; the dead 5-group alternative suggests someone intended a grouped IA. This plan does **not** adopt the grouped IA (that would be a redesign) — it simply deletes the dead code and keeps the working flat bar, optionally grouping tabs visually with dividers using existing components if desired. The ⌘K conflict and the Dashboard mis-navigation are fixed so the palette is reliable.

### 10.6 Dead affordances erode trust

Every dead button (Settings Save/Delete, Login Forgot, landing email) teaches users the app is unreliable. The rule applied throughout the roadmap: **a control is either wired or removed** — never present-but-inert.

---

## 11. Page-by-page implementation plan

Each page below lists its current real behavior, the specific changes tagged `[WIRE]` / `[REMOVE-FAKE]` / `[FIX]` / `[BACKEND-GAP]`, and the acceptance criterion. Nothing here changes branding or introduces invented features.

### 11.1 Landing page (`/`)

**Today:** Seven mock viewports; fabricated statistics; fictional CLI/IDE/CI; dead email + footer links; two unused components (`Hero`, `ResearchViz`); inconsistent widths and heavy whitespace.

Changes: `[REMOVE-FAKE]` delete the fabricated aggregate statistics (412 papers, 98.4% confidence, 14 bottlenecks, 23/47/12/5 workspace counts, "4 layers · 12 components · zero drift") and replace with qualitative copy or, if a public stats endpoint is exposed, real platform aggregates. `[REMOVE-FAKE]` remove `ViewportDeveloper` entirely (the CLI/extension/action do not exist). `[FIX]` make the email field either functional (if a waitlist endpoint exists) or remove it; give footer Privacy/Terms/Docs real hrefs or remove them. `[FIX]` delete unused `Hero.tsx` / `ResearchViz.tsx`. `[UX]` standardize content max-width and tighten vertical rhythm.

Acceptance: no number on the landing page is a fabricated literal; every link and input either works or is gone; the page reads as honest marketing.

### 11.2 Login (`/login`)

**Today:** Correct login flow; dead "Forgot?" button.

Changes: `[FIX]` remove the "Forgot?" control (no password-reset endpoint exists) — or, if password reset is desired, that is a `[BACKEND-GAP]` to add a reset endpoint first, then wire. Default recommendation: remove now, reintroduce with backend support later.

Acceptance: no inert controls; login/refresh flow unchanged.

### 11.3 Register (`/register`)

**Today:** Correct, clean, good states. No changes required beyond keeping it consistent with any shared form-state patterns.

### 11.4 Dashboard (`/app`)

**Today:** Fully real (`['projects']`), good skeleton/empty/error states, honest split of active vs. all projects.

Changes: none required for honesty. `[WIRE]` optional enhancement — add project edit/delete affordances here or in Library (see 11.6) using the already-defined `projects.update`/`projects.remove`. Keep as-is otherwise; this is a model page.

Acceptance: unchanged behavior; optionally gains edit/delete entry points.

### 11.5 Discoveries (`/discoveries`)

**Today:** Real data from the first completed/researching project; no per-section empty states; no error handling on source/gaps queries.

Changes: `[FIX]` add per-section empty states (project exists but no sources/gaps yet) and error handling on the `['sources']`/`['gaps']` queries. `[UX]` consider allowing selection of which project is featured rather than always the first.

Acceptance: no silent blank sections; query failures surface visibly.

### 11.6 Library (`/library`)

**Today:** Fully real with server-side status filter + client-side search; good states.

Changes: `[WIRE]` add per-card edit (rename/update via `projects.update`) and delete (`projects.remove`) actions — this is the natural home for project management. Confirm delete with a dialog (primitive exists). `[UX]` invalidate `['projects', ...]` keys on mutation so the sidebar and dashboard update.

Acceptance: users can rename and delete projects; lists refresh reactively.

### 11.7 New Project (`/new`)

**Today:** Real create mutation, good progressive form; Cancel goes to `/` (landing).

Changes: `[FIX]` Cancel should navigate to `/app` (or browser back), not the marketing page.

Acceptance: Cancel returns the signed-in user to the app.

### 11.8 Team Activity (`/team`)

**Today:** Synthesized activity feed; self-only members with "coming soon."

Changes: `[REMOVE-FAKE]` relabel the feed honestly as "Recent project updates" (which is what timestamps represent) and stop attributing invented actions to named users. `[REMOVE-FAKE]` remove the phantom members section, or `[WIRE]`/`[BACKEND-GAP]` wire it to real member data if a member-list endpoint is added and sharing UI is built on `projects.addMember`/`removeMember`. Default: relabel feed, remove members section until backend supports it.

Acceptance: nothing on the page implies collaboration that isn't real.

### 11.9 Settings (`/settings`)

**Today:** Entirely static; dead Save and Delete buttons; no `/system` data.

Changes: `[FIX]` remove or wire the profile "Save changes" button — there is no user-update endpoint, so either add one (`[BACKEND-GAP]`) or make the field read-only. `[FIX]` remove "Delete account" unless a user-delete endpoint exists. `[WIRE]` after the backend auth-gates `/system` (§8.4), add a read-only "AI Providers" and "Model Routing" section showing `/system/providers` and `/system/ai-config` — real operational transparency for the technical audience. `[BACKEND-GAP]` prerequisite: auth-gate the `/system` routes first.

Acceptance: no dead controls; Settings shows real provider/routing data (read-only) once the backend is gated.

### 11.10 Project workspace shell (`/projects/:id/*`)

**Today:** Inline 12-tab nav; two dead alternative nav architectures; polling-driven progress; socket used for invalidation.

Changes: `[FIX]` delete the unused `features/project/{ProjectNav,ProjectHeader,ResearchView,InsightsView,BuildView}` and `components/project/{ProjectNav,ProjectHeader}` dead code. `[UX]` optionally group the 12 tabs visually with existing dividers. Keep polling as the progress backbone.

Acceptance: one navigation implementation; no orphaned components.

### 11.11 Overview tab

**Today:** Real stats + `keyConcepts` + metadata; three invented metric cards.

Changes: `[REMOVE-FAKE]` delete the Feasibility, Quality, and Cost cards. `[WIRE]` optionally replace the Cost card with a real figure if an `AIUsageLog` read endpoint is exposed (`[BACKEND-GAP]`). `[UX]` use `stats` consistently; keep the real stat grid.

Acceptance: every number on Overview traces to a real endpoint.

### 11.12 Research / Progress tab

**Today:** Polling-driven job view; hardcoded stage list in stepper; fake queue banner.

Changes: `[REMOVE-FAKE]` drive `PipelineStepper` from `job.stages` rather than the internal static list. `[WIRE]` connect `QueueStatusBanner` to the real `research:queue_status` event and hide it when there is no queue data. `[FIX]` don't force all steps "done" at 100%; reflect actual per-stage status.

Acceptance: stepper matches backend stages; queue info is real or absent.

### 11.13 Sources tab

**Today:** Real, good states; `relevanceScore` shown only when > 0; `credibilityScore` never shown.

Changes: `[UX]` optionally surface `credibilityScore` when present (it sometimes is). Keep the "hide when zero" pattern. Minimal change.

Acceptance: no misleading zeros; existing behavior preserved.

### 11.14 Evidence tab

**Today:** Real; always renders `confidence` (→ "0%" when unpopulated); score breakdown shown only when present; `evidenceScore` unused.

Changes: `[FIX]` hide the confidence chip when the value is absent/zero instead of showing "0%". Keep the support/contradiction counts.

Acceptance: no "0% confidence" chips on unpopulated claims.

### 11.15 Solutions tab

**Today:** Real; `similarityScore` correctly hidden when absent; `sourceIds` unused. No changes required (this tab already follows the honest pattern). Optionally link `sourceIds` to sources if desired.

### 11.16 Gaps tab

**Today:** Real; **always renders `gap.confidence`** (→ "0%") and sorts by it.

Changes: `[FIX]` hide confidence when unpopulated and make the sort resilient to missing values (fall back to impact/difficulty ordering). This is the most visible "0%" leak.

Acceptance: no misleading confidence on gaps; ordering stays sensible.

### 11.17 Stress test tab

**Today:** Reads `problemUnderstanding.assumptions`; "Run" hits a stub; ignores real `metadata.critique`.

Changes: `[WIRE]` read and render `job.metadata.critique` (the real Critic output) — this is the tab's real content. `[FIX]` remove or disable the "Run" button since `stresstest` is a stub (`[BACKEND-GAP]` if a real trigger is wanted). Keep the assumptions display.

Acceptance: the tab shows the real critique; no button that does nothing.

### 11.18 Architecture tab (flagship — see §12.4 for full detail)

**Today:** Real architecture text; fake, unrenderable, project-agnostic diagram; decorative type tabs.

Changes: `[REMOVE-FAKE]` delete the hardcoded `graph TD` literal. `[WIRE]` install a real diagram renderer and generate the diagram from the project's real `architecture.components` (nodes) and `dataFlow`/`dependencies` (edges). `[FIX]` make the diagram-type tabs reflect views actually derivable from the data, or reduce to those that are. Full design in §12.4.

Acceptance: the diagram depicts *this project's* real components; no fabricated graph; the renderer actually renders.

### 11.19 Resources tab

**Today:** Backend returns empty, so the tab is thin.

Changes: `[BACKEND-GAP]` the honest fix is backend-side (populate resources in the pipeline). Frontend: `[UX]` ensure a clear empty state ("No resource recommendations yet") rather than a blank tab. No fabrication.

Acceptance: honest empty state until backend populates resources.

### 11.20 Roadmap tab

**Today:** Real phases/tasks/risks; good rendering. No changes required.

### 11.21 Build tab

**Today:** Roadmap-derived checklist (session-only state); hardcoded blueprint card.

Changes: `[REMOVE-FAKE]` delete the hardcoded "Project Blueprint & Specifications" card. `[UX]` keep the roadmap-derived checklist but label it clearly as a local, unsaved working view. `[BACKEND-GAP]` persistent task state requires a backend tasks endpoint; until then, do not imply persistence.

Acceptance: no hardcoded blueprint; checklist honestly labeled as local.

### 11.22 Copilot tab

**Today:** Real chat over HTTP; citations fetched but not rendered; send errors swallowed.

Changes: `[WIRE]` render the `citations[]` (index, title, url, sourceType) beneath assistant messages — the core grounded-answers feature. `[FIX]` surface send errors (toast or inline) instead of `console.error`. `[UX]` restore or remove the empty suggested-prompts block.

Acceptance: assistant answers show clickable citations; failed sends are visible.

### 11.23 Global floating copilot

**Today:** Mock (`setTimeout` canned reply) mounted app-wide.

Changes: `[REMOVE-FAKE]` stop returning canned text. `[WIRE]`/`[UX]` either (a) scope the floating copilot to project pages and route it through the real `copilotService`, reusing the `CopilotTab` logic, or (b) remove the floating copilot entirely and keep only the in-project tab. Recommendation: (a) if the floating UX is valued, but only render it inside a project context where grounding exists; otherwise (b).

Acceptance: no canned replies anywhere; any copilot UI calls the real endpoint.

### 11.24 Export center modal

**Today:** Broken double-prefixed URL; advertises stub `pdf`/`docx`.

Changes: `[FIX]` correct the URL to `/export/:id/:format` (single `/api/v1` via the axios baseURL); move it into a typed `exportService`. `[REMOVE-FAKE]`/`[UX]` hide `pdf` and `docx` (backend stubs) or badge them "coming soon" and disable; keep `markdown`, `html`, `json` which work.

Acceptance: markdown/html/json download successfully; no format is offered that 404s or returns a stub.

### 11.25 Notification tray

**Today:** Hardcoded mock, not mounted.

Changes: `[REMOVE-FAKE]` remove the mock. `[BACKEND-GAP]` reintroduce only when the backend emits real `notification:new` events / exposes a notifications read; at that point wire the socket listener and a real tray.

Acceptance: no fake notifications; tray returns only when backed by real data.

---

## 12. Cross-cutting subsystems

The user's brief calls out several areas for dedicated attention. Each is treated here end-to-end.

### 12.1 Landing page subsystem

The landing page is the product's first impression and currently its least honest surface. The design intent is sound — a scroll-driven narrative from "boot" through pipeline, evidence, architecture, workspace, and CTA — and that structure is worth keeping. What must change is the *content substrate*: it is entirely fabricated.

The plan keeps the seven-beat narrative but rebuilds three things. First, **every hard statistic is removed or made real.** "412 papers cross-referenced," "98.4% verification confidence," and the workspace's "23/47/12/5" counts are deleted; if the team wants live proof-of-activity, expose a tiny public aggregate endpoint (e.g., total public projects or total sources indexed) and show that real number, otherwise use qualitative phrasing ("Cross-references papers, repos, and standards"). Second, **the fictional developer ecosystem (`ViewportDeveloper`) is removed** — there is no CLI, no VS Code extension, and no GitHub Action, and advertising them is a straightforward misrepresentation. Third, **layout coherence** is improved in place: one content max-width, tighter vertical rhythm, and removal of the dead `Hero`/`ResearchViz` components and dead email/footer affordances.

The visual language, palette, motion, and node-canvas aesthetic all stay. This is a truth edit, not a redesign.

### 12.2 Authentication subsystem

Authentication is already the healthiest subsystem and needs the least work. The token lifecycle, interceptors, route guards, and persistence are correct. The only honesty issue is the dead "Forgot?" affordance, resolved by removal (or by a future password-reset backend). Beyond that, two optional hardening/UX improvements are worth noting without over-engineering: surface a clear inline error on failed login/register (already largely present), and ensure logout clears the socket connection (it should call `disconnectSocket`). No structural change is warranted — this subsystem is a model for the rest.

### 12.3 Dashboard subsystem

The Dashboard is real and well-built; its role in the plan is to *stay* real and become the entry point for the newly-wired project management actions (edit/delete) if those aren't placed solely in Library. The key discipline here is resisting the temptation to add "richer" dashboard widgets that would require inventing data — no fabricated velocity charts, no fake health scores. If a widget can't be backed by `projects.list`, `projects.stats`, or a real aggregate, it doesn't belong. The one genuinely available enhancement is surfacing real per-project `stats` (source/solution/gap counts) more prominently on cards, since that endpoint exists.

### 12.4 Architecture subsystem (the flagship — full design)

This is the most important single piece of work in the plan, because the brief names the Architecture page as one of NEXUS's strongest features and it is currently its most misleading.

**The truth of the current state.** There is no `mermaid` (or any diagram) library installed. `MermaidViewer` prints its input as `<pre>` text and its seven type-tabs are inert. `ArchitectureTab` hands it a hardcoded `graph TD` string describing NEXUS's *own* internal pipeline (Client → API Gateway → Redis Lock → Worker Pool → Multi-Agent Engine), gated only on the project's `dataFlow` text being non-empty — so every project, regardless of subject, shows the identical fake graph, and even that is never actually rendered as a diagram.

**What real data is available.** The architecture endpoint returns structured, real content: `overview` (text), `components[]` (each with `name`, `description`, `technology`, `responsibilities`, `dependencies`, `category`), `dataFlow` (text), `deploymentModel`, `scalabilityNotes`, plus `recommendations[]`. This is *more* than enough to construct a genuine, project-specific diagram — the components are nodes and their `dependencies` are edges. The backend's orphaned Kroki diagram engine is a separate, unwired path and should be ignored for the frontend fix; the frontend can generate diagrams client-side from the component graph it already receives.

**The design.** Install a real client-side diagram renderer (Mermaid is the natural choice given the existing naming and the type-tab concept). On the Architecture tab, **generate the Mermaid source at runtime from `architecture.components` and their `dependencies`**: emit one node per component (labeled with name + technology, colored/grouped by `category`), and one edge per dependency relationship. Render that with the real Mermaid library. The `overview`, `dataFlow`, `deploymentModel`, `scalabilityNotes`, and `recommendations` continue to render as the real text sections they already are.

**The type tabs.** The seven decorative tabs (flowchart / sequence / ER / component / class / deployment / infrastructure) cannot all be honestly derived from the available data. The plan reduces them to the views that *can* be generated from real data — realistically a **component/dependency graph** (from `components` + `dependencies`) and possibly a **deployment view** (from `deploymentModel` text, if structured enough) — and removes the tabs that have no backing data rather than leaving inert toggles. If the team wants the full seven types later, that is a `[BACKEND-GAP]`: wire the existing Kroki engine and have the architecture endpoint return real per-type diagram sources; the frontend would then render whatever the backend actually provides.

**Acceptance for the flagship.** Open two different projects; each Architecture tab shows a diagram built from *that project's* real components and dependencies, actually rendered (not text), with no hardcoded NEXUS graph and no inert type toggles. This single change converts the page from the app's biggest misrepresentation into a real showcase of the backend's architecture output.

### 12.5 Build subsystem

Build is the one area where the product's ambition genuinely outruns the backend, and the plan's job is to keep the frontend honest about that. The roadmap-derived checklist is a reasonable, real-data-backed view (it's computed from real roadmap tasks), so it stays — but relabeled as a local, unsaved working view, with the hardcoded blueprint card removed. Persistent build/task tracking is a real future feature that requires a backend tasks endpoint (`[BACKEND-GAP]`); until that exists, the frontend must not imply that checking a box persists anything. No fabricated file trees, API contracts, or tech stacks.

### 12.6 Export subsystem

Export is a near-miss: the backend genuinely produces markdown/html/json and the modal's UX is fine — it's just pointed at the wrong URL and over-advertises formats. The fix is small and high-value: correct the double `/api/v1` prefix (ideally by routing through a typed `exportService` that relies on the axios baseURL), and present only the three working formats, with pdf/docx either hidden or clearly disabled as "coming soon" (they are backend stubs). Once corrected, this becomes a genuinely useful feature with almost no engineering.

### 12.7 Realtime / Socket subsystem

The realtime story should be framed honestly as **"polling-first, socket-assisted."** Polling already drives progress reliably (3s job refetch while running; 5s project-list refetch while any project researches). The socket layer adds instant completion/failure toasts and cache invalidation, which is a nice bonus. Two improvements: wire `research:queue_status` to replace the fake queue banner, and ensure the socket disconnects on logout. Do **not** re-architect around sockets or imply realtime guarantees the backend can't keep (`research:progress` fires rarely); polling remains the backbone.

### 12.8 Notifications subsystem

There is no honest notification feature today because the backend doesn't produce notifications. The plan removes the mock tray now and specifies the wiring for later: when the backend emits real `notification:new` events (and/or exposes a read endpoint), add a socket listener in a small notifications hook, a typed service, and re-mount a real tray. Until then, the absence of a tray is the correct, honest state.

---

## 13. Prioritized backlog

Ordered by (trust impact × user value) ÷ effort. Each item is independently shippable. Tags: `[FIX]` bug, `[REMOVE-FAKE]` honesty, `[WIRE]` connect real capability, `[BACKEND-GAP]` needs backend first. Effort: S (< half day), M (~1 day), L (multi-day).

### P0 — Trust-critical, ship first

| # | Item | Type | Effort | Why now |
|---|---|---|---|---|
| 1 | Fix Export URL double-prefix; route via `exportService`; hide pdf/docx stubs | `[FIX]` `[REMOVE-FAKE]` | S | Every export currently 404s; trivial fix, immediate real feature |
| 2 | Architecture: remove hardcoded graph; install Mermaid; generate diagram from real `components`+`dependencies` | `[REMOVE-FAKE]` `[WIRE]` | L | Flagship feature is currently fake; highest product value |
| 3 | Overview: delete the three invented metric cards (feasibility/quality/cost) | `[REMOVE-FAKE]` | S | Fabricated numbers on the workspace landing tab |
| 4 | Global floating copilot: remove canned reply; route to real `copilotService` or remove | `[REMOVE-FAKE]` `[WIRE]` | M | Core feature currently faked app-wide |
| 5 | Landing: remove fabricated statistics + fictional CLI/IDE/CI section | `[REMOVE-FAKE]` | M | First impression is misrepresentation |
| 6 | Copilot tab: render citations; surface send errors | `[WIRE]` `[FIX]` | S | Delivers the central grounded-answers promise |

### P1 — High value, low risk

| # | Item | Type | Effort | Notes |
|---|---|---|---|---|
| 7 | Gaps/Evidence: hide confidence chips when unpopulated (no "0%") | `[FIX]` | S | Most visible score leak |
| 8 | Stress tab: render real `job.metadata.critique`; remove stub "Run" button | `[WIRE]` `[FIX]` | M | Turns a near-dead tab into real content |
| 9 | Library: add project rename (`projects.update`) + delete (`projects.remove`) | `[WIRE]` | M | Closes obvious CRUD hole |
| 10 | Pipeline stepper: drive from real `job.stages`; fix 100%-forces-done | `[REMOVE-FAKE]` `[FIX]` | S | Trust on the most-watched screen |
| 11 | Queue banner: wire `research:queue_status`; hide when absent | `[WIRE]` `[REMOVE-FAKE]` | S | Replaces fake position/wait |
| 12 | Remove/relabel Team activity feed + phantom members | `[REMOVE-FAKE]` | S | Stops implying collaboration |
| 13 | Notification tray: remove mock | `[REMOVE-FAKE]` | S | Not mounted anyway; delete cleanly |
| 14 | Command palette: single ⌘K palette; fix Dashboard→`/app` | `[FIX]` | S | Reliability of nav |
| 15 | New Project Cancel → `/app`; Login remove "Forgot?"; Settings remove dead buttons | `[FIX]` | S | Kill inert controls |

### P2 — Cleanup & polish

| # | Item | Type | Effort | Notes |
|---|---|---|---|---|
| 16 | Delete dead nav architectures (`features/project/*View`, both `ProjectNav`/`ProjectHeader` pairs) | `[FIX]` | S | Remove orphaned code |
| 17 | Delete dead landing components (`Hero`, `ResearchViz`); deprecated `pinned` store shim | `[FIX]` | S | Housekeeping |
| 18 | Discoveries: per-section empty/error states | `[FIX]` | S | State consistency |
| 19 | Build: remove hardcoded blueprint; relabel checklist as local | `[REMOVE-FAKE]` | S | Honesty about non-persistence |
| 20 | Landing: standardize max-width + vertical rhythm | `[UX]` | S | Layout coherence |
| 21 | Resources tab: clear empty state | `[UX]` | S | Honest emptiness |

### P3 — Requires backend work first (`[BACKEND-GAP]`)

| # | Item | Prereq |
|---|---|---|
| 22 | Settings: show real `/system` providers + routing | Auth-gate `/system` routes first (security) |
| 23 | Overview: real research cost card | Expose `AIUsageLog` read endpoint |
| 24 | Real notification tray | Backend emits real `notification:new` |
| 25 | Persistent Build task tracking | Backend tasks endpoint |
| 26 | Full 7 architecture diagram types | Wire Kroki engine; return per-type sources |
| 27 | Password reset on Login | Backend reset endpoint |
| 28 | Real Team collaboration | Member-list endpoint + sharing UX |
| 29 | Working PDF/DOCX export | Implement backend renderers |

---

## 14. Implementation phases & sequencing

The backlog maps to five phases. Each phase is independently shippable and leaves the app in a more honest state than before.

**Phase 1 — Stop the bleeding (honesty + broken wiring).** P0 items 1, 3, 5, plus P1 items 7, 12, 13 and P2 item 19. Goal: no screen shows fabricated numbers, and the export bug is fixed. Pure frontend; no backend dependency. This phase alone resolves the user's core "no fake data" mandate for the majority of surfaces.

**Phase 2 — The flagship.** P0 item 2 (Architecture diagram) plus P0 item 6 (copilot citations) and P0 item 4 (unify copilot). Goal: the two showcase features — architecture visualization and grounded copilot — become real. Adds one dependency (`mermaid`).

**Phase 3 — Wire the unused-but-real capabilities.** P1 items 8, 9, 10, 11. Goal: surface `metadata.critique`, enable project edit/delete, make progress/queue truthful. All backed by existing endpoints/events.

**Phase 4 — Correctness & cleanup.** P1 items 14, 15; all P2 items. Goal: kill inert controls, delete dead code, consistent states.

**Phase 5 — Backend-gated features.** P3 items, each unblocked as its backend prerequisite lands. Sequenced with backend team; the `/system` auth-gating (item 22) should be prioritized as a security fix regardless of the frontend surfacing.

Sequencing rationale: honesty fixes first because they are trust-critical and dependency-free; the flagship second because it is the single highest product-value item; wiring third; cleanup fourth; backend-gated last. No phase depends on a later phase.

---

## 15. File-level change map

Concrete files to touch, grouped by backlog item. Paths are under `nexus/frontend/src`.

**Export fix (item 1):** `components/export/ExportCenterModal.tsx` (correct URL, drop pdf/docx or disable); add `exportService` to `lib/services.ts`.

**Architecture flagship (item 2):** `package.json` (add `mermaid`); `components/diagram/MermaidViewer.tsx` (render real Mermaid, honest tabs); `features/project/ArchitectureTab.tsx` (remove hardcoded `graph TD`; generate source from `data.architecture.components`/`dependencies`); possibly a new `lib/mermaid.ts` helper to build source from the component graph; `types/index.ts` (confirm `ProjectArchitectureComponent.dependencies` shape).

**Overview cards (item 3):** `features/project/OverviewTab.tsx` (delete the three hardcoded cards).

**Copilot (items 4, 6):** `components/copilot/CopilotChatWindow.tsx` (remove `setTimeout` mock; call real service or gate to project scope); `features/project/CopilotTab.tsx` (render `citations[]`; toast on send error); `stores/copilot.ts` (remove hardcoded welcome or repurpose).

**Landing (items 5, 17, 20):** `pages/LandingPage.tsx`; `components/landing/ViewportEvidence.tsx`, `ViewportWorkspace.tsx`, `ViewportArchitecture.tsx` (remove fabricated stats); delete `components/landing/ViewportDeveloper.tsx`; delete unused `components/landing/Hero.tsx`, `ResearchViz.tsx`; `ViewportInitialize.tsx` (email/footer); normalize widths across viewports.

**Score leaks (item 7):** `features/project/GapsTab.tsx`, `EvidenceTab.tsx` (conditional score chips + resilient sort).

**Stress (item 8):** `features/project/StressTestTab.tsx` (read `job.metadata.critique`; remove/disable Run).

**Project CRUD (item 9):** `pages/LibraryPage.tsx` (edit/delete UI + confirm dialog + query invalidation); reuse `projectsService.update`/`remove` (already in `lib/services.ts`).

**Progress/queue (items 10, 11):** `components/pipeline/PipelineStepper.tsx` (use `job.stages`); `features/project/ResearchProgressTab.tsx` (stop passing hardcoded queue props); `components/pipeline/QueueStatusBanner.tsx` (consume real data); `hooks/useResearchSocket.ts` (add `research:queue_status` listener).

**Team (item 12):** `pages/TeamActivityPage.tsx` (relabel feed; remove members section).

**Notifications (item 13):** delete `components/shared/NotificationTray.tsx`; remove its import in `layouts/AppLayout.tsx`.

**Command palette (item 14):** `layouts/AppLayout.tsx` (mount one palette); keep `components/CommandMenu.tsx` (fix Dashboard→`/app`) or `components/search/CommandPaletteModal.tsx` — remove the other.

**Inert controls (item 15):** `pages/NewProjectPage.tsx` (Cancel→`/app`); `pages/LoginPage.tsx` (remove Forgot); `pages/SettingsPage.tsx` (remove/disable Save & Delete).

**Dead code (item 16):** delete `features/project/{ProjectNav,ProjectHeader,ResearchView,InsightsView,BuildView}.tsx` and `components/project/{ProjectNav,ProjectHeader}.tsx`.

**Build (item 19):** `features/project/BuildModeTab.tsx` (remove blueprint card; relabel checklist).

**Discoveries (item 18):** `pages/DiscoveriesPage.tsx` (empty/error states).

**Settings/system (P3 item 22):** add `systemService` to `lib/services.ts`; `pages/SettingsPage.tsx` (read-only providers/routing) — after backend auth-gates `/system`.

---

## 16. Verification & acceptance criteria

Global acceptance for the whole effort: **a user (and an auditor) can navigate every screen and every number, list, and control they see is either backed by a real backend response or is honestly absent.** Concretely:

Run a real research job end-to-end and confirm: progress reflects real `job.stages`; the queue banner shows real data or is hidden; sources/evidence/solutions/gaps render with no misleading "0%" chips; the Architecture tab renders a diagram built from *that project's* components; the Copilot answers with visible citations; export downloads a real markdown/html/json file. Open the landing page and confirm no fabricated statistic and no reference to a non-existent CLI/extension/action. Open Settings and confirm no dead buttons (and, post-backend-gating, real provider data). Grep the codebase for the removed mock literals (`98.4`, `412 papers`, `₹12,000`, `88.5`, the canned copilot reply string, the hardcoded `graph TD` string) and confirm zero matches. Confirm the dead nav components no longer exist and the app still builds (`tsc -b`). Confirm logout disconnects the socket.

Per-item acceptance criteria are stated inline in §11. Each backlog item should ship with a manual verification note referencing the relevant real endpoint or the confirmed removal.

---

## 17. Appendix — reference tables

### 17.1 Endpoint → consumer map

| Endpoint | Service fn | Consumed by | Status |
|---|---|---|---|
| `POST /auth/register` | `authService.register` | RegisterPage/auth store | OK |
| `POST /auth/login` | `authService.login` | LoginPage/auth store | OK |
| `POST /auth/logout` | `authService.logout` | auth store | OK |
| `GET /auth/me` | `authService.me` | auth store init | OK |
| `POST /auth/refresh` | (interceptor) | `lib/api.ts` | OK |
| `GET /projects` | `projectsService.list` | Dashboard/Library/Discoveries/Team/sidebar/palette | OK |
| `GET /projects/:id` | `projectsService.get` | ProjectPage/StressTab | OK |
| `POST /projects` | `projectsService.create` | NewProjectPage | OK |
| `PUT /projects/:id` | `projectsService.update` | **none** | WIRE (item 9) |
| `DELETE /projects/:id` | `projectsService.remove` | **none** | WIRE (item 9) |
| `GET /projects/:id/stats` | `projectsService.stats` | OverviewTab | OK (dilute fake) |
| `POST /projects/:id/members` | `projectsService.addMember` | **none** | BACKEND-GAP (item 28) |
| `DELETE /projects/:id/members/:uid` | `projectsService.removeMember` | **none** | BACKEND-GAP (item 28) |
| `POST /research/:id/start` | `researchService.start` | ProjectPage/ResearchProgress | OK |
| `GET /research/:id/job` | `researchService.job` | ResearchProgressTab | OK (critique unused) |
| `GET /research/:id/sources` | `researchService.sources` | SourcesTab/Discoveries | OK |
| `GET /research/:id/evidence` | `researchService.evidence` | EvidenceTab/Overview | OK (0% leak) |
| `GET /research/:id/solutions` | `researchService.solutions` | SolutionsTab | OK |
| `GET /research/:id/gaps` | `researchService.gaps` | GapsTab/Discoveries | OK (0% leak) |
| `GET /research/:id/architecture` | `researchService.architecture` | ArchitectureTab | PARTIAL (fake diagram) |
| `GET /research/:id/resources` | `researchService.resources` | ResourcesTab/Build | EMPTY (backend) |
| `GET /research/:id/roadmap` | `researchService.roadmap` | RoadmapTab/Build | OK |
| `POST /research/:id/stresstest` | `researchService.stresstest` | StressTestTab | STUB |
| `POST /copilot/:id/chat` | `copilotService.chat` | CopilotTab (real) / floating (fake) | PARTIAL |
| `GET /copilot/:id/history` | `copilotService.history` | CopilotTab | OK |
| `GET /export/:id/:format` | (raw, broken) | ExportCenterModal | FIX (item 1) |
| `GET /system/providers` | **none** | **none** | WIRE + BACKEND-GAP (item 22) |
| `GET /system/ai-config` | **none** | **none** | WIRE + BACKEND-GAP (item 22) |

### 17.2 Socket event → listener map

| Event | Listener | Action | Plan |
|---|---|---|---|
| `research:progress` | `useResearchSocket` | invalidate queries | keep (polling is backbone) |
| `research:complete` | `useResearchSocket` | toast + invalidate | keep |
| `research:failed` | `useResearchSocket` | toast + invalidate | keep |
| `research:queue_status` | none | — | WIRE (item 11) |
| `notification:new` | none | — | BACKEND-GAP (item 24) |

### 17.3 React Query key inventory

`['projects']`, `['projects','sidebar']`, `['projects','library',status]`, `['projects','discoveries']`, `['projects','all']`, `['projects','palette']`, `['project',id]`, `['research-job',id]`, `['sources',id(,filter)]`, `['evidence',id]`, `['solutions',id]`, `['gaps',id]`, `['architecture',id]`, `['resources',id]`, `['roadmap',id]`, `['copilot-history',id]`. Mutations that must invalidate on success: create (`['projects*']`), update/delete (`['projects*']`, `['project',id]`), stresstest (`['project',id]`, `['research-job',id]`).

### 17.4 Fake-literal removal checklist (grep targets)

`98.4`, `412 papers`, `14 bottlenecks`, `23`/`47`/`12`/`5` workspace counts, `4 layers · 12 components · zero drift`, `88.5`, `92%`, `₹12,000`, the canned copilot reply ("…decoupled workers with Redis caching…"), the hardcoded `graph TD; A[Client Request]...` string, the two seeded `NotificationTray` messages, `nexus-engine/verify-action@v2`, `queuePosition={1}`, `estimatedWaitTimeSeconds={120}`. Zero matches after Phases 1–4 = honesty achieved.

---

*End of master plan. This document is analysis and roadmap only — no application code has been modified. Implementation should proceed phase by phase per §14, verifying each item against §16 before moving on.*
