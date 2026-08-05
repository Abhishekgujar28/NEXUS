# 07 — AI Agents

> **Scope:** Architecture for all AI agents — the base agent class, 8 research pipeline agents, the copilot agent, prompt engineering strategy, and orchestration contracts.

---

## 1. Purpose

Define the agent architecture so that every AI-powered component in NEXUS follows a consistent pattern: typed inputs, structured outputs, retry logic, error isolation, and progress reporting. This document specifies what each agent does, what it receives, what it produces, and how it integrates with the pipeline.

---

## 2. Responsibilities

| Component | Responsibility |
|---|---|
| `[PLANNED] agents/base.agent.ts` | Abstract base class with common agent behavior |
| `[PLANNED] agents/*.agent.ts` | 8 research agents + copilot agent |
| `[PLANNED] agents/prompts/*.ts` | System prompts and prompt templates |
| `integrations/AIProvider.ts` | Interface for AI generation |
| `integrations/gemini.ts` | Gemini implementation (generate, generateStructured, embed) |
| `copilot.controller.ts` | Current synchronous copilot (to be replaced by agent) |

---

## 3. Folder Mapping (Planned)

```
src/agents/
├── base.agent.ts                    # Abstract base agent
├── problemUnderstanding.agent.ts    # Agent 1: Idea decomposition
├── queryPlanner.agent.ts            # Agent 2: Search query generation
├── deepSearch.agent.ts              # Agent 3: Multi-provider search
├── researchAnalysis.agent.ts        # Agent 4: Evidence extraction
├── gapFinder.agent.ts               # Agent 5: Innovation gap detection
├── critic.agent.ts                  # Agent 6: Stress testing
├── architect.agent.ts               # Agent 7: Architecture design
├── roadmap.agent.ts                 # Agent 8: Roadmap generation
├── copilot.agent.ts                 # Conversational copilot
└── prompts/
    ├── problemUnderstanding.prompt.ts
    ├── queryPlanner.prompt.ts
    ├── deepSearch.prompt.ts
    ├── researchAnalysis.prompt.ts
    ├── gapFinder.prompt.ts
    ├── critic.prompt.ts
    ├── architect.prompt.ts
    ├── roadmap.prompt.ts
    └── copilot.prompt.ts
```

---

## 4. Base Agent Architecture

### 4.1 Abstract Base Agent

```
BaseAgent<TInput, TOutput>
  │
  ├── name: string              ← Agent identifier for logging/progress
  ├── provider: AIProvider      ← Injected AI provider
  │
  ├── execute(input: TInput): Promise<TOutput>
  │     │
  │     ├── buildPrompt(input)  ← Subclass implements
  │     ├── provider.generateStructured<TOutput>(prompt, systemPrompt)
  │     ├── validateOutput(raw) ← Optional subclass validation
  │     └── return output
  │
  ├── buildPrompt(input: TInput): string         ← Abstract
  ├── getSystemPrompt(): string                   ← Abstract
  └── validateOutput(raw: unknown): TOutput       ← Optional override
```

### 4.2 Agent Contract

Every agent MUST:
1. Accept a typed input object
2. Return a typed output object
3. Use `generateStructured<T>()` for structured responses (JSON mode)
4. Use `generate()` for free-text responses
5. Include retry logic (inherited from Gemini provider — 3 attempts)
6. Throw on unrecoverable failure (orchestrator catches and handles)
7. Never directly access MongoDB — return data for the orchestrator to persist

---

## 5. Agent Specifications

### 5.1 Agent 1: ProblemUnderstanding

| Aspect | Detail |
|---|---|
| **Stage Key** | `understand` |
| **Input** | `{ title, description, domain, projectType, targetUsers, platform, preferredTech, constraints, teamSize, timeline, skillLevel }` |
| **Output** | `{ concepts: string[], domain: string, constraints: string[], successCriteria: string[], technicalRequirements: string[], assumptions: string[] }` |
| **AI Method** | `generateStructured()` |
| **Persists To** | `Project.problemUnderstanding.definition` |

**Prompt Strategy:**
- System: "You are a research analyst specializing in problem decomposition..."
- User: Project metadata formatted as structured context
- Output: JSON with extracted concepts, requirements, and constraints

---

### 5.2 Agent 2: QueryPlanner

| Aspect | Detail |
|---|---|
| **Stage Key** | `plan` |
| **Input** | Problem understanding output + project metadata |
| **Output** | `{ queries: Array<{ query: string, target: 'web' \| 'academic' \| 'code', rationale: string }> }` |
| **AI Method** | `generateStructured()` |
| **Persists To** | `ResearchJob.metadata.queries` |

**Prompt Strategy:**
- Generate 10-15 diverse queries across web, academic, and code dimensions
- Include specific technical terms, competitor names, and research angles
- Vary query specificity from broad to narrow

---

### 5.3 Agent 3: DeepSearch

| Aspect | Detail |
|---|---|
| **Stage Key** | `search_web`, `search_papers`, `search_github` |
| **Input** | Planned queries from Agent 2 |
| **Output** | `NormalizedSource[]` |
| **AI Method** | None — this agent orchestrates provider calls, not AI |
| **Persists To** | `ResearchSource` collection |

**Execution Flow:**
```
queries (from Agent 2)
    │
    ├── Web queries ──► SerperProvider.search() ──┐
    ├── Academic queries ──► ArxivProvider.search() ──┤
    │                  ──► SemanticScholarProvider.search() ──┤
    └── Code queries ──► GitHubProvider.search() ──┘
                                                    │
                                              Flatten + Deduplicate
                                                    │
                                              ResearchSource.insertMany()
```

---

### 5.4 Agent 4: ResearchAnalysis

| Aspect | Detail |
|---|---|
| **Stage Key** | `analyze` |
| **Input** | All `ResearchSource` documents for the project |
| **Output** | `{ claims: EvidenceClaimData[], solutions: ExistingSolutionData[] }` |
| **AI Method** | `generateStructured()` (batched — sources may be large) |
| **Persists To** | `EvidenceClaim` + `ExistingSolution` collections |

**Prompt Strategy:**
- Feed sources in batches (respecting token limits)
- Extract claims with supporting/contradicting evidence
- Identify existing products/solutions with features, strengths, limitations
- Score confidence based on source quality and agreement

---

### 5.5 Agent 5: GapFinder

| Aspect | Detail |
|---|---|
| **Stage Key** | `gaps` |
| **Input** | Evidence claims + existing solutions + project requirements |
| **Output** | `{ gaps: InnovationGapData[] }` |
| **AI Method** | `generateStructured()` |
| **Persists To** | `InnovationGap` collection |

**Prompt Strategy:**
- Compare what solutions offer vs. what the project needs
- Identify unserved needs, technical limitations, UX shortcomings
- Rate each gap on impact, difficulty, and confidence
- Categorize: feature, technical, cost, UX, integration, scalability, user, research

---

### 5.6 Agent 6: Critic

| Aspect | Detail |
|---|---|
| **Stage Key** | `stress` |
| **Input** | All prior outputs (understanding, evidence, solutions, gaps) |
| **Output** | `{ critiques: Array<{ area, issue, severity, suggestion }>, overallAssessment: string }` |
| **AI Method** | `generateStructured()` |
| **Persists To** | `ResearchJob.metadata.critique` |

**Prompt Strategy:**
- Challenge assumptions in the problem understanding
- Question evidence quality and potential biases
- Identify missing perspectives or overlooked competitors
- Stress-test the gap analysis for completeness
- Rate severity: `critical`, `major`, `minor`

---

### 5.7 Agent 7: Architect

| Aspect | Detail |
|---|---|
| **Stage Key** | `architecture` |
| **Input** | Gaps + critique + project requirements + constraints |
| **Output** | `{ architecture: ArchitectureData, recommendations: TechRecommendation[] }` |
| **AI Method** | `generateStructured()` |
| **Persists To** | `Project.problemUnderstanding.architecture` + `.recommendations` |

**Output Schema:**
```typescript
interface ArchitectureData {
  overview: string;
  components: Array<{
    name: string;
    description: string;
    technology: string;
    responsibilities: string[];
  }>;
  dataFlow: string;
  deploymentModel: string;
  scalabilityNotes: string;
}
```

---

### 5.8 Agent 8: Roadmap

| Aspect | Detail |
|---|---|
| **Stage Key** | `roadmap` |
| **Input** | Architecture + gaps + requirements + team constraints |
| **Output** | `{ roadmap: RoadmapData, resources: ResourceData[] }` |
| **AI Method** | `generateStructured()` |
| **Persists To** | `Project.problemUnderstanding.roadmap` + `.resources` |

**Output Schema:**
```typescript
interface RoadmapData {
  phases: Array<{
    phase: number;
    title: string;
    duration: string;
    milestones: string[];
    deliverables: string[];
    dependencies: string[];
  }>;
  totalDuration: string;
  criticalPath: string[];
  risks: Array<{
    risk: string;
    mitigation: string;
    probability: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
  }>;
}
```

---

## 6. Copilot Agent

### 6.1 Current Implementation

The copilot is currently a synchronous one-shot call in `copilot.controller.ts`:

```
1. Load project context (title, domain, description)
2. Build simple prompt: project context + user message
3. Call aiProvider.generate(prompt)
4. Return answer (no history, no RAG, no streaming)
```

### 6.2 Planned Copilot Architecture

```
User message
      │
      ▼
┌──────────────────────┐
│ Load conversation    │  ← Conversation model (planned)
│ history (last N)     │
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│ RAG retrieval        │  ← Query project's vector store
│ (relevant chunks)    │  ← Filter by projectId
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│ Build prompt:        │
│ • System prompt      │
│ • Project context    │
│ • RAG context        │
│ • Conversation hist. │
│ • User message       │
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│ Gemini generate      │  ← Stream via Socket.io
│ (token-by-token)     │
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│ Persist to           │
│ Conversation model   │
└──────────────────────┘
```

---

## 7. AI Provider Interface

### 7.1 Contract

```typescript
interface AIProvider {
  readonly name: string;
  isConfigured(): boolean;
  generate(prompt: string, system?: string): Promise<string>;
  generateStructured<T>(prompt: string, system?: string): Promise<T>;
  embed(text: string): Promise<number[]>;
}
```

### 7.2 Gemini Implementation

| Method | Model | Configuration |
|---|---|---|
| `generate()` | `gemini-1.5-flash` | Default, optional system instruction |
| `generateStructured<T>()` | `gemini-1.5-flash` | `responseMimeType: 'application/json'` |
| `embed()` | `text-embedding-004` | Default |

### 7.3 Retry & Error Handling

- All methods use `retry(fn, 3)` — 3 attempts with exponential backoff (500ms, 1000ms, 2000ms)
- `generateStructured` additionally retries on JSON parse failure
- `extractJson()` tolerates markdown code fences around JSON responses
- Unconfigured provider throws `AIProviderNotConfiguredError`

---

## 8. Prompt Engineering Guidelines

### 8.1 Prompt Structure

```
SYSTEM PROMPT:
  - Agent role and expertise
  - Output format requirements (JSON schema)
  - Constraints and guardrails

USER PROMPT:
  - Structured input data
  - Specific task instructions
  - Examples (few-shot) when needed
```

### 8.2 Best Practices

1. **Explicit JSON schemas**: Include TypeScript-style type definitions in system prompts
2. **Chain-of-thought**: For complex analysis, instruct "think step by step"
3. **Output validation**: Parse and validate JSON output before trusting it
4. **Token budget**: Keep total prompt + expected output within model context window
5. **Temperature**: Use low temperature (0.2-0.4) for structured output, higher for creative tasks
6. **Defensive parsing**: `extractJson()` strips markdown fences and finds first `{` or `[`

---

## 9. Error Handling

| Error | Source | Handling |
|---|---|---|
| `AIProviderNotConfiguredError` | Missing API key | 503 to client |
| Gemini API error (rate limit) | Google API | Retry 3x |
| Gemini API error (quota) | Google API | Fail stage, log |
| Malformed JSON response | Model output | Retry 3x, then fail |
| Token limit exceeded | Too much input | Batch/truncate input |
| Timeout | Slow generation | Configurable timeout |

---

## 10. Dependencies

| Component | Depends On |
|---|---|
| All agents | `AIProvider` interface |
| `GeminiProvider` | `@google/generative-ai`, `config.geminiApiKey` |
| `DeepSearch` agent | Research providers, deduplicator |
| `Copilot` agent | RAG pipeline (planned), Conversation model (planned) |
| All agents | `core/logger` for error logging |
| `generateStructured` | `utils/retry` for exponential backoff |

---

## 11. Testing Strategy

| Test | Description | Priority |
|---|---|---|
| Base agent execute | Mock provider, verify prompt building | P0 |
| ProblemUnderstanding output | Validate structured output schema | P0 |
| QueryPlanner diversity | Ensure queries cover web/academic/code | P1 |
| ResearchAnalysis batching | Large source set doesn't exceed tokens | P1 |
| GapFinder categories | Output has valid category enums | P1 |
| Critic independence | Critique challenges prior findings | P2 |
| Gemini retry | 2 failures + 1 success → succeeds | P0 |
| JSON extraction | Markdown-fenced JSON parsed correctly | P0 |
| Provider not configured | Throws descriptive error | P0 |
| Copilot context building | Includes project + RAG + history | P1 |

---

## 12. Future Improvements

1. **Multi-Model Support**: Swap Gemini for Claude, GPT-4, or local models via the `AIProvider` interface
2. **Streaming Generation**: Token-by-token streaming for long outputs
3. **Agent Memory**: Cross-run memory for incremental research
4. **Parallel Agents**: Run independent agents concurrently where DAG allows
5. **Human-in-the-Loop**: Pause pipeline for user approval at critical stages
6. **Token Usage Tracking**: Log token consumption per agent for cost monitoring
7. **Prompt Versioning**: Version control prompts separately from code
8. **Fine-Tuning**: Domain-specific model fine-tuning for better research quality
