# NEXUS Enterprise Frontend Architecture Specification
**Version:** 2.0.0 (Enterprise SaaS UX & Integration Engine)  
**Author:** Lead Frontend Architect & Senior UX Engineer  
**Status:** Approved Specification — Pending Implementation Approval  
**Target Audience:** Frontend Engineers, UX Designers, Core Product Team  

---

## 1. Executive Overview & Theme Preservation Principles

### 1.1 Executive Overview
NEXUS Frontend Version 2.0.0 is an enterprise-grade UX upgrade designed to seamlessly expose and visualize the full capabilities of the NEXUS Version 2.0.0 Backend Architecture. It transforms the user interface into a responsive, real-time command center while strictly preserving all existing visual design aesthetics, color schemes, typography, and branding identity.

### 1.2 Strict Theme & Architecture Guardrails
- **DO NOT Redesign Theme**: Preserve existing dark mode palette, primary citrine accent colors, card background styles, border colors, and font hierarchies.
- **DO NOT Change APIs**: Utilize existing and newly exposed backend REST endpoints (`/api/v1/*`) and Socket.IO real-time channels without altering backend contracts.
- **DO NOT Remove Existing Features**: Preserve all current pages, routes, data tables, and forms.
- **DO NOT Break Routing**: Ensure backward compatibility for existing URLs (`/app`, `/projects/:id`, `/settings`, etc.).

---

## 2. Current Frontend Audit & Deficit Analysis

### 2.1 Missing Backend Data Integrations
1. **Queue & Backpressure Metrics**: The UI currently lacks queue position badges, estimated wait time countdowns, and socket queue status notifications.
2. **Stage Checkpoint Progress**: Displays static linear progress bars instead of an 11-stage interactive research stepper reflecting active agent checkpoints.
3. **Multi-Perspective Architecture Diagrams**: Architecture is rendered as plain text rather than multi-view Mermaid AST diagrams (PNG, SVG, PDF).
4. **Export Artifact Center**: Missing dedicated exporter UI for PDF, DOCX, Markdown, HTML, and JSON document downloads.
5. **Advanced Intelligence Metrics**: Missing UI widgets for Feasibility Scores, Categorized Risk Heatmaps, Cloud & Token Cost Estimates, Quality Scores (Scalability, Security, Maintainability, Performance), and Build vs. Buy analysis.
6. **Provider & Circuit Breaker Telemetry**: No visual indicators for active search providers or circuit breaker health status.

### 2.2 UX Inconsistencies & Page Ergonomics
1. **Standalone Copilot Page**: Dedicated `/copilot` route isolates assistant interactions; needs replacement with a global, floating, persistent chat widget accessible from any page.
2. **Static Dashboard Widgets**: Dashboard statistics lack micro-animations, loading skeletons, and live status badges.
3. **Plain Toast Error Handling**: External network errors display raw message strings instead of contextual retry dialogs.

### 2.3 Critical Routing & Authentication Bug Analysis (Issue #7)
- **Root Cause**: In `LoginPage.tsx` and `RegisterPage.tsx`, the `from` fallback navigation state defaults to `'/'` (the Landing Page) instead of `'/app'` (the Dashboard). Consequently, upon successful login or registration, `navigate(from)` sends authenticated users back to the Landing Page.
- **Solution**: Set default fallback to `'/app'` across all auth handlers; configure `LandingPage` to automatically display a "Go to Dashboard" action for authenticated users.

---

## 3. Frontend System Architecture (v2.0)

```text
frontend/
├── src/
│   ├── components/                         # UI & Feature Components
│   │   ├── copilot/                        # Global Floating Copilot Assistant [NEW]
│   │   │   ├── FloatingCopilotButton.tsx   # Floating trigger button with unread badge
│   │   │   ├── CopilotChatWindow.tsx       # Resizable floating chat window
│   │   │   └── CopilotMessageList.tsx      # Markdown, code & citation message list
│   │   ├── diagram/                        # Interactive Diagram Viewer [NEW]
│   │   │   ├── MermaidViewer.tsx           # Mermaid AST client renderer
│   │   │   ├── DiagramToolbar.tsx          # Zoom, pan, view selector & download controls
│   │   │   └── DiagramExportModal.tsx      # PNG, SVG, PDF export trigger modal
│   │   ├── export/                         # Document Export Center [NEW]
│   │   │   ├── ExportCenterModal.tsx       # Multi-format report exporter
│   │   │   └── ExportFormatCard.tsx        # Format selection & download status card
│   │   ├── landing/                        # Landing Page Viewports
│   │   ├── pipeline/                       # Live Pipeline Stepper & Queue UI [NEW]
│   │   │   ├── PipelineStepper.tsx         # 11-stage interactive research stepper
│   │   │   ├── QueueStatusBanner.tsx       # Queue position & wait time banner
│   │   │   └── AgentStatusBadge.tsx        # Active agent domain badge
│   │   ├── project/                        # Project Command Center Views
│   │   │   ├── OverviewTab.tsx             # Feasibility, Quality & Cost dashboard
│   │   │   ├── LiveResearchTab.tsx         # Real-time pipeline monitor
│   │   │   ├── EvidenceTab.tsx             # Evidence claims & citations grid
│   │   │   ├── CompetitorsTab.tsx          # Competitor matrix & comparison grid
│   │   │   ├── GapAnalysisTab.tsx          # Innovation gap opportunity matrix
│   │   │   ├── ArchitectureTab.tsx         # Mermaid AST diagrams & design notes
│   │   │   ├── RoadmapTab.tsx              # Gantt chart milestone timeline
│   │   │   ├── ReportsTab.tsx              # Risk, Cost, Feasibility intelligence reports
│   │   │   ├── ExportsTab.tsx              # Document download center
│   │   │   └── SourcesTab.tsx              # 16+ search sources registry
│   │   ├── search/                         # Global Search & Command Palette [NEW]
│   │   │   └── CommandPaletteModal.tsx     # Ctrl+K global navigation & search
│   │   ├── shared/                         # Reusable Shared Controls
│   │   │   ├── NotificationTray.tsx        # Header notification dropdown tray [NEW]
│   │   │   ├── ErrorBoundary.tsx           # Fallback error wrapper
│   │   │   └── LoadingSkeleton.tsx         # Animated loading skeletons
│   │   └── ui/                             # Base Radix & Tailwind UI Primitives
│   ├── features/                           # Domain Feature Modules
│   ├── hooks/                              # Custom React Hooks
│   │   ├── useSocketProgress.ts            # Socket.IO progress & queue telemetry hook [NEW]
│   │   ├── useCommandPalette.ts            # Ctrl+K shortcut listener hook [NEW]
│   │   └── useDiagramExport.ts             # SVG/PNG/PDF download hook [NEW]
│   ├── layouts/                            # Layout Enclosers
│   │   ├── AppLayout.tsx                   # Main app header, sidebar, copilot integration
│   │   └── AuthLayout.tsx                  # Clean authentication wrapper
│   ├── lib/                                # Utilities & API Connectors
│   │   ├── api.ts                          # Axios interceptors & token refreshes
│   │   ├── motion.ts                       # Framer Motion animation presets
│   │   └── services.ts                     # REST API service connectors
│   ├── pages/                              # Route Views
│   │   ├── DashboardPage.tsx               # Workspace overview & quick triggers
│   │   ├── DiscoveriesPage.tsx             # Global research discovery hub
│   │   ├── LandingPage.tsx                 # Operating system landing page
│   │   ├── LibraryPage.tsx                 # Saved reports & exports archive
│   │   ├── LoginPage.tsx                   # Auth login page (Fixed redirect)
│   │   ├── NewProjectPage.tsx              # Research project wizard
│   │   ├── ProjectPage.tsx                 # Project Command Center
│   │   ├── RegisterPage.tsx                # Auth register page (Fixed redirect)
│   │   ├── SettingsPage.tsx                # User preferences & notification settings
│   │   └── TeamActivityPage.tsx            # Activity feed & member management
│   ├── stores/                             # Zustand Global State
│   │   ├── auth.ts                         # User auth session state
│   │   ├── copilot.ts                      # Floating copilot state [NEW]
│   │   ├── socket.ts                       # Socket connection & queue telemetry state [NEW]
│   │   └── project.ts                      # Active project research state [NEW]
│   ├── types/                              # TypeScript Interfaces
│   └── App.tsx                             # Application Router & Providers
```

---

## 4. Complete Backend Data Integration Plan

### 4.1 Endpoint & Real-Time Channel Mapping

| Backend Resource / Channel | Frontend Component / State | Rendered UI Representation |
| :--- | :--- | :--- |
| **`POST /api/v1/research/:id/start`** | `NewProjectPage` / `ProjectPage` | Triggers job, handles HTTP 200 (duplicate active) or HTTP 202 (queued) |
| **`Socket 'research:queue_status'`**| `QueueStatusBanner` | Queue Position badge, Estimated Wait Time countdown timer |
| **`Socket 'research:progress'`** | `PipelineStepper` | 11-Stage animated progress stepper, active agent badge, percentage |
| **`Socket 'research:complete'`** | `ProjectPage` | Auto-fetches completed research assets, triggers success notification |
| **`GET /api/v1/research/:id/job`** | `LiveResearchTab` | Checkpoint status, stage timestamps, error notes, retry button |
| **`GET /api/v1/research/:id/architecture`**| `ArchitectureTab` | Mermaid AST source, rendered PNG/SVG/PDF, component cards |
| **`GET /api/v1/export/:id/:format`**| `ExportCenterModal` | One-click document generator & download stream |
| **`GET /api/v1/system/metrics`** | `SettingsPage` / `OverviewTab` | System latency, provider status, circuit breaker health badges |
| **`POST /api/v1/copilot/:id/message`**| `FloatingCopilot` | Streaming RAG answer, citations, conversation history window |

---

## 5. Real-Time Pipeline Visualization Engine

Replaces simple progress bars with an interactive, multi-stage pipeline monitor ([`PipelineStepper.tsx`](file:///d:/PROGRAMMING/FULL-STACK/FORGE/nexus/frontend/src/components/pipeline/PipelineStepper.tsx)).

```text
 [1. Understand Scope] ──► [2. Query Plan] ──► [3. Deep Search] ──► [4. Analysis]
         │                                                              │
         ▼                                                              ▼
 [8. Roadmap] ◄── [7. Architecture] ◄── [6. Stress Test] ◄── [5. Gap Finder]
```

### Visual Components
- **Stage Status Indicators**: `completed` (green check icon), `running` (pulsing citrine ring), `pending` (hairline muted border), `failed` (amber warning badge).
- **Telemetry Callout**: Displays active Agent Name (e.g. `ArchitectAgent`), active search provider, elapsed duration counter, and estimated time remaining.

---

## 6. Global Floating AI Copilot System

Removes the standalone `/copilot` page and replaces it with a global, persistent, floating chat widget mounted inside `AppLayout.tsx`.

```text
 ┌────────────────────────────────────────────────────────┐
 │ NEXUS Copilot [Project: Autonomous Vehicle Platform]   │ [x] [_]
 ├────────────────────────────────────────────────────────┤
 │ User: How should we scale the vector index?           │
 │ Copilot: Based on retrieved research sources...        │
 │ [Citation 1: arXiv:2401.092] [Citation 2: GitHub/chroma]│
 ├────────────────────────────────────────────────────────┤
 │ [ Ask Copilot...                                ] (Send│
 └────────────────────────────────────────────────────────┘
                       ▲
        Floating Trigger Button (Bottom-Right)
```

### Specifications
- **Global Availability**: Always accessible in bottom-right corner across all `/app/*` routes.
- **Shortcuts & Window Controls**: Toggle via `Ctrl+/` or `Cmd+/`; features minimize, expand, and resize controls.
- **Markdown & Citations**: Renders code blocks, markdown text, and clickable source citation chips.

---

## 7. Premium Dashboard & Project Command Center

### 7.1 Dashboard Page ([`DashboardPage.tsx`](file:///d:/PROGRAMMING/FULL-STACK/FORGE/nexus/frontend/src/pages/DashboardPage.tsx))
- **Workspace Summary Cards**: Total Projects, Active Pipelines, Completed Reports, Storage Used.
- **Recent Research Runs**: Cards featuring progress rings, domain tags, confidence scores, and quick action buttons ("View Architecture", "Export PDF").
- **System Telemetry Bar**: Circuit breaker health indicators and provider latency status.

### 7.2 Project Command Center ([`ProjectPage.tsx`](file:///d:/PROGRAMMING/FULL-STACK/FORGE/nexus/frontend/src/pages/ProjectPage.tsx))
Organized into 12 dedicated tabs:
1. **Overview**: Feasibility index, Quality score radar/cards, Cost estimates, Quick summary.
2. **Live Research**: Real-time 11-stage pipeline monitor & socket stream.
3. **Evidence Claims**: Filterable claims grid with supporting/contradicting sources.
4. **Competitors**: Solution matrix comparing features, strengths, and limitations.
5. **Gap Analysis**: Opportunity grid categorized by impact and difficulty.
6. **Architecture**: Interactive 7-view Mermaid diagram viewer & component designs.
7. **Roadmap**: Milestone Gantt chart timeline with risk tags and phase breakdowns.
8. **Reports**: Market feasibility, risk analysis matrix, and FinOps cloud budget.
9. **Exports**: One-click PDF, DOCX, Markdown, HTML, and JSON document generator.
10. **Research Sources**: Paginated list of 16+ retrieved search sources.
11. **Activity Log**: Project history and execution logs.
12. **Settings**: Project metadata and member RBAC management.

---

## 8. Interactive Architecture Diagram Viewer

Displays backend-generated Mermaid AST code inside [`MermaidViewer.tsx`](file:///d:/PROGRAMMING/FULL-STACK/FORGE/nexus/frontend/src/components/diagram/MermaidViewer.tsx).

- **View Selector Tabs**: Flowchart, Sequence, ER, Component, Class, Deployment, Infrastructure.
- **Controls**: Zoom in/out, pan, reset view, copy Mermaid AST source, toggle fullscreen mode.
- **Export Options**: Download SVG, PNG, or PDF formats directly from the toolbar.

---

## 9. Dedicated Export Center

Provides a single modal or tab ([`ExportCenterModal.tsx`](file:///d:/PROGRAMMING/FULL-STACK/FORGE/nexus/frontend/src/components/export/ExportCenterModal.tsx)) for downloading research assets.

- **Supported Formats**: PDF (Publication-grade print layout), DOCX (Microsoft Word), Markdown (Developer docs), HTML (Standalone styled report), JSON (Raw data).
- **Download Progress**: Shows real-time compilation status and file size telemetry.

---

## 10. Queue & Backpressure User Experience

When a research job is queued due to worker backlog:
- **`QueueStatusBanner.tsx`**: Displays a top notification banner with queue position (e.g. `Position #3 in queue`), estimated wait countdown (`Est. 2m 15s remaining`), and live socket status updates.

---

## 11. Visual Data Visualizations & Matrix Components

- **Gantt Chart Timeline**: Visual milestone execution plan.
- **2D Market Positioning Quadrant**: SVG chart comparing value vs complexity and innovation vs feasibility.
- **Competitor Feature Comparison Grid**: Side-by-side tabular view with capability checkmarks.
- **Risk Heatmap Matrix**: Categorized risks categorized by severity and mitigation protocols.

---

## 12. Global Search & Command Palette (`Ctrl + K`)

- **Keyboard Shortcut**: `Ctrl + K` or `Cmd + K` opens the command palette ([`CommandPaletteModal.tsx`](file:///d:/PROGRAMMING/FULL-STACK/FORGE/nexus/frontend/src/components/search/CommandPaletteModal.tsx)).
- **Search Scope**: Search projects, evidence claims, competitor solutions, research sources, architecture notes, and system actions.

---

## 13. Real-Time Notification Center

- **Header Dropdown**: Displays unread notification count badge in top navigation bar.
- **Event Subscriptions**: Notifies user when research jobs complete, fail, enter queue, or export files are ready.

---

## 14. Authentication Flow Fix (Issue #7)

### 14.1 Login & Register Redirect Fix
- Update `from` state in `LoginPage.tsx` and `RegisterPage.tsx`:
  ```typescript
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/app';
  ```
- Configure `LandingPage.tsx`: If `useAuthStore` status is `'authed'`, render a prominent `"Go to Workspace (/app)"` button in the header bar.

---

## 15. Animations & Micro-Interactions Blueprint (Framer Motion)

- **Page Transitions**: Smooth fade and subtle slide transitions (`variants={pageVariants}`).
- **Card Entrance**: Staggered list animations for evidence claims, gaps, and project cards.
- **Hover Elevation**: Micro elevation (`whileHover={{ y: -2 }}`) on interactive cards and buttons.
- **Performance First**: `will-change` CSS properties and lightweight motion transitions to maintain 60 FPS.

---

## 16. Phased Implementation Roadmap

```text
  Phase 1: Critical Bug Fixes & Navigation Infrastructure
  ├── Fix Auth Redirect Bug #7 (LoginPage / RegisterPage default to '/app')
  ├── Implement Global Command Palette (Ctrl+K)
  └── Implement Header Notification Center & Socket Telemetry Store

  Phase 2: Global Floating AI Copilot System
  ├── Remove dedicated /copilot route from App.tsx
  ├── Build FloatingCopilotButton & CopilotChatWindow components
  └── Integrate RAG context streaming, markdown & citation rendering

  Phase 3: Real-Time Pipeline & Queue Backpressure UI
  ├── Build PipelineStepper component (11-Stage Stepper)
  ├── Build QueueStatusBanner component (Position & Wait Time)
  └── Wire Socket.IO 'research:queue_status' and 'research:progress' listeners

  Phase 4: Project Command Center & Tabbed Views
  ├── Restructure ProjectPage.tsx into 12 Tabbed Views
  ├── Build OverviewTab (Feasibility, Quality & Cost Cards)
  ├── Build EvidenceTab, CompetitorsTab, GapAnalysisTab, SourcesTab
  └── Build ReportsTab (Risk Heatmap & FinOps Budget)

  Phase 5: Architecture Diagram Viewer & Export Center
  ├── Build MermaidViewer component (7 View Tabs, Zoom, Pan)
  ├── Build ExportCenterModal component (PDF, DOCX, MD, HTML, JSON)
  └── Integrate Kroki / SVG download handlers

  Phase 6: Data Visualizations & Polishing
  ├── Build Gantt Chart Timeline component
  ├── Build 2D Market Quadrant & Comparison Table SVGs
  ├── Add Framer Motion entrance animations & loading skeletons
  └── Perform end-to-end user workflow verification
```
