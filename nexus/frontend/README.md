# NEXUS — Frontend

The web UI for NEXUS, the AI-powered Research & Innovation Copilot.
Built with Vite + React 18 + TypeScript, styled with a bespoke design system on top of Tailwind CSS.

---

## Quick start

```bash
# From this directory
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` and `/socket.io` to the backend at `http://localhost:5000` (configurable in `vite.config.ts`).

You should have the backend running in parallel:

```bash
# From ../server
npm install
npm run dev
```

---

## Scripts

| Command           | What it does                                     |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Start Vite dev server on `:5173` with HMR        |
| `npm run build`   | Type-check with `tsc -b` then bundle to `dist/`  |
| `npm run preview` | Serve the production build locally               |
| `npm run lint`    | Lint the codebase (ESLint)                       |

---

## Environment variables

None are required for local development — the dev proxy handles routing.

For production or non-default deployments, set:

| Variable          | Default                    | Purpose                              |
| ----------------- | -------------------------- | ------------------------------------ |
| `VITE_API_URL`    | `""` (uses `/api` proxy)   | Base URL of the backend REST API     |
| `VITE_SOCKET_URL` | `""` (same origin)         | URL of the backend Socket.IO server  |

Create a `.env.local` alongside `package.json` if you need to override them.

---

## Directory layout

```
src/
  main.tsx              # React root
  App.tsx               # Router, query client, providers
  index.css             # Design tokens + Tailwind layers

  types/index.ts        # Domain types mirroring the backend Mongoose models

  lib/
    api.ts              # Axios client + token storage + refresh interceptor
    services.ts         # Typed service wrappers for /auth, /projects, /research, /copilot
    socket.ts           # Singleton Socket.IO client
    utils.ts            # cn, titleCase, pct, timeAgo, initials, ...

  stores/
    auth.ts             # Zustand auth store (user, tokens, init/login/logout)

  components/ui/        # Design-system primitives
    button, input, badge, card, dialog, tabs, tooltip, dropdown-menu,
    avatar, progress, skeleton, scroll-area, section, empty-state, toaster

  layouts/
    AuthLayout.tsx      # Centered form shell for login/register
    AppLayout.tsx       # Icon-rail sidebar + topbar + <Outlet/>

  pages/
    LoginPage, RegisterPage
    DashboardPage       # Project grid + active-research strip
    NewProjectPage      # Create project (progressive disclosure)
    ProjectPage         # 9-tab workspace shell
    SettingsPage

  features/project/     # One file per workspace tab
    OverviewTab, ResearchProgressTab, SourcesTab, EvidenceTab,
    SolutionsTab, GapsTab, ArchitectureTab, RoadmapTab, CopilotTab
```

---

## Design system

The visual language is **editorial and dark-first**: a warm charcoal `ink` surface, a `citrine` accent used sparingly, semantic `moss/amber/clay` for success/warning/danger.

- **Fonts** — Instrument Serif for display headings, Inter for UI, JetBrains Mono for code and numerics.
- **Tokens** — see `tailwind.config.ts` (palette + typography scale + shadows + animations) and `src/index.css` (CSS custom properties for light/dark).
- **Primitives** — every UI element is a variant-driven component in `src/components/ui/`. Use them; avoid ad-hoc Tailwind cascades in features.
- **Layout** — pages compose `<Card>`, `<Section>`, `<EmptyState>` etc. The app shell (`AppLayout`) handles the icon rail and topbar so features only render their content.

---

## Data flow

- **REST** — `src/lib/api.ts` wraps axios with token refresh. Services in `src/lib/services.ts` unwrap the `{ success, data }` envelope so callers see the payload directly.
- **State** — TanStack Query v5 for server state; Zustand (with `persist`) for auth. There is no global client store beyond auth.
- **Realtime** — `src/lib/socket.ts` exposes a singleton `getSocket()` and `joinProject(id)` / `leaveProject(id)`. The research progress tab is designed to react to `research:progress` events.

---

## Routing

```
/login                          # public
/register                       # public
/                               # dashboard (protected)
/new                            # new project (protected)
/projects/:projectId/*          # workspace with 9 tabs (protected)
/settings                       # settings (protected)
```

Unknown paths redirect to `/`. Auth-only pages are wrapped in `<ProtectedRoute>`; guest-only pages in `<GuestRoute>`.

---

## Backend contract

The frontend expects the Express API described in `../server/`. Key endpoints:

- `POST /api/v1/auth/register`, `/login`, `/logout`, `/refresh`, `/me`
- `GET|POST|PATCH|DELETE /api/v1/projects[/:id]`, `GET /projects/:id/stats`
- `POST /api/v1/research/:projectId/start`
- `GET /api/v1/research/:projectId/{job,sources,evidence,solutions,gaps,architecture,resources,roadmap,stresstest}`
- `POST /api/v1/copilot/:projectId/chat`, `GET /api/v1/copilot/:projectId/history`

Tokens are exchanged in JSON bodies (not cookies) and cached in `localStorage` under `nexus.tokens.v1`.

---

## Notes

- Tailwind is JIT-compiled by Vite via `postcss.config.js`; no separate build step.
- Path alias `@/*` → `src/*` is configured in both `tsconfig.json` and `vite.config.ts`.
- `strict: true` is on. Prefer explicit types on cross-file boundaries and let inference do the rest.
- Do not introduce new global stores casually — most page-level state belongs in React Query or component state.


<!-- /
this too better when iuse antigravity claude opus 4.6 so the how main thing is the there some chnages in the landing page like the it took middle part andside is clean that looks  weied so fix that width and then in hero section looks great just that background balls animated looks spreading and running like that and then other loooks fine just it looks minimal but itlooks very empty so add some efforts to looks heavy and looks animated and the showing workspecaes and images looks great ajust nned some  primum animation so the chnage this only how the main part is the now is  -->