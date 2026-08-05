# 08 — RAG Pipeline

> **Scope:** Retrieval-Augmented Generation pipeline — document chunking, embedding generation, vector storage in ChromaDB, similarity search, reranking, context assembly, and generation.

---

## 1. Purpose

The RAG pipeline enables the NEXUS copilot to answer project-specific questions using the actual research data collected during the research pipeline. Instead of relying solely on Gemini's general knowledge, RAG retrieves relevant chunks from the project's research sources and injects them as context into the generation prompt.

**Status:** The RAG pipeline is **planned but not yet implemented**. ChromaDB is installed as a dependency. This document defines the complete specification for implementation.

---

## 2. Responsibilities

| Component | Responsibility |
|---|---|
| `[PLANNED] rag/chroma.client.ts` | ChromaDB connection and collection management |
| `[PLANNED] rag/chunker.ts` | Document splitting into overlapping chunks |
| `[PLANNED] rag/embedder.ts` | Text → vector embedding via Gemini |
| `[PLANNED] rag/retriever.ts` | Similarity search + reranking |
| `[PLANNED] rag/pipeline.ts` | End-to-end query → context → generation |
| `integrations/gemini.ts` | `embed()` method for text-embedding-004 |
| `config.ts` | RAG configuration parameters |

---

## 3. Folder Mapping (Planned)

```
src/rag/
├── chroma.client.ts    # ChromaDB connection + collection CRUD
├── chunker.ts          # Sliding-window text chunking
├── embedder.ts         # Batch embedding generation
├── retriever.ts        # Vector search + hybrid reranking
└── pipeline.ts         # Orchestrates chunk → embed → store → retrieve → generate
```

---

## 4. Configuration

From `src/core/config.ts`:

| Parameter | Env Variable | Default | Description |
|---|---|---|---|
| `rag.chunkSize` | `RAG_CHUNK_SIZE` | `1200` | Characters per chunk |
| `rag.chunkOverlap` | `RAG_CHUNK_OVERLAP` | `150` | Overlap between adjacent chunks |
| `rag.topK` | `RAG_TOP_K` | `8` | Number of nearest neighbors to retrieve |
| `rag.maxContextChars` | `RAG_MAX_CONTEXT_CHARS` | `12000` | Max total characters in assembled context |
| `chromaUrl` | `CHROMA_URL` | `http://localhost:8000` | ChromaDB server URL |
| `vectorStore` | `VECTOR_STORE` | `memory` | Vector store backend: `memory` or `chroma` |

---

## 5. Pipeline Architecture

```
            INDEXING PHASE (after research completes)
            ═══════════════════════════════════════

ResearchSource documents
        │
        ▼
┌───────────────────┐
│  1. Chunking      │  Sliding window: 1200 chars, 150 overlap
│                   │  Input: source.snippet + source.content
│                   │  Output: Chunk[] with metadata
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  2. Embedding     │  Gemini text-embedding-004
│                   │  Input: chunk text
│                   │  Output: 768-dim float vector
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  3. Upsert        │  ChromaDB or in-memory store
│                   │  Key: chunk ID
│                   │  Vector: embedding
│                   │  Metadata: { sourceId, projectId, chunkIndex,
│                   │              sourceType, title, url }
└───────────────────┘


            QUERY PHASE (copilot chat)
            ══════════════════════════

User query
        │
        ▼
┌───────────────────┐
│  4. Query Embed   │  Same model: text-embedding-004
│                   │  User question → 768-dim vector
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  5. Retrieval     │  Top-K=8 nearest neighbors
│                   │  Filtered by: projectId
│                   │  Distance metric: cosine similarity
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  6. Reranking     │  Score = 0.7 × vector_similarity
│                   │         + 0.3 × keyword_overlap
│                   │  Take top 5 after reranking
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  7. Context       │  Assemble top chunks with citations:
│     Assembly      │  "[Source 1] chunk text..."
│                   │  "[Source 2] chunk text..."
│                   │  Total: ≤ 12000 chars
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  8. Generation    │  System prompt + project context
│                   │  + assembled RAG context
│                   │  + conversation history
│                   │  + user question
│                   │  → Gemini → streamed response
└───────────────────┘
```

---

## 6. Chunking Strategy

### 6.1 Sliding Window Algorithm

```
chunkDocument(text, chunkSize=1200, overlap=150):
  chunks = []
  position = 0
  chunkIndex = 0

  while position < text.length:
    end = min(position + chunkSize, text.length)

    // Try to break at sentence boundary
    breakPoint = findLastSentenceEnd(text, position, end)
    if breakPoint > position + chunkSize/2:
      end = breakPoint

    chunks.push({
      text: text.slice(position, end),
      chunkIndex: chunkIndex++,
      startChar: position,
      endChar: end
    })

    position = end - overlap
    if position >= text.length: break

  return chunks
```

### 6.2 Input Sources

For each `ResearchSource` document:
1. Primary text: `source.content` (if available)
2. Fallback: `source.snippet`
3. Prepend metadata: `"[${source.sourceType}] ${source.title}\n${text}"`

### 6.3 Chunk Metadata

Each chunk stored in the vector DB carries:

```typescript
interface ChunkMetadata {
  projectId: string;
  sourceId: string;         // ResearchSource._id
  chunkIndex: number;       // Position within the source
  sourceType: string;       // paper, repo, web, etc.
  title: string;            // Source title for citations
  url: string;              // Source URL for links
  provider: string;         // serper, github, arxiv, semanticScholar
  relevanceScore: number;   // Original source relevance
}
```

---

## 7. Embedding Generation

### 7.1 Model

| Attribute | Value |
|---|---|
| Model | `text-embedding-004` (Gemini) |
| Dimensions | 768 |
| Method | `aiProvider.embed(text)` |
| Retry | 3 attempts via `retry()` utility |

### 7.2 Batch Processing

```
embedBatch(chunks, batchSize=20):
  for batch in chunks.grouped(batchSize):
    embeddings = await Promise.all(
      batch.map(chunk => aiProvider.embed(chunk.text))
    )
    // Rate limit: pause between batches if needed
    yield { chunks: batch, embeddings }
```

---

## 8. Vector Store

### 8.1 ChromaDB Collection Naming

```
Collection name: `nexus_project_{projectId}`
```

Each project gets its own collection for isolation and efficient filtering.

### 8.2 Storage Schema

```
ID:        `{sourceId}_{chunkIndex}`
Vector:    768-dim float array
Document:  chunk text
Metadata:  ChunkMetadata object
```

### 8.3 Memory Fallback

When `config.vectorStore === 'memory'`:
- Chunks and embeddings stored in an in-memory Map
- Cosine similarity computed manually
- Suitable for development only — data lost on restart

---

## 9. Retrieval & Reranking

### 9.1 Vector Search

```
retrieve(query, projectId, topK=8):
  1. queryEmbedding = await aiProvider.embed(query)
  2. collection = chroma.getCollection(`nexus_project_${projectId}`)
  3. results = collection.query({
       queryEmbeddings: [queryEmbedding],
       nResults: topK,
       where: { projectId }  // metadata filter
     })
  4. return results with distances and metadata
```

### 9.2 Hybrid Reranking

```
rerank(candidates, query):
  queryTerms = tokenize(query.toLowerCase())

  for each candidate:
    vectorScore = 1 - candidate.distance  // cosine similarity
    keywordScore = computeKeywordOverlap(candidate.text, queryTerms)
    candidate.finalScore = 0.7 * vectorScore + 0.3 * keywordScore

  sort by finalScore descending
  return top 5
```

### 9.3 Keyword Overlap Computation

```
computeKeywordOverlap(text, queryTerms):
  textTerms = tokenize(text.toLowerCase())
  matches = queryTerms.filter(term => textTerms.includes(term))
  return matches.length / queryTerms.length
```

---

## 10. Context Assembly

### 10.1 Assembly Algorithm

```
assembleContext(rankedChunks, maxChars=12000):
  context = ""
  citations = []

  for (i, chunk) in enumerate(rankedChunks):
    citation = `[Source ${i+1}: ${chunk.metadata.title}]`
    entry = `${citation}\n${chunk.text}\n\n`

    if context.length + entry.length > maxChars:
      break

    context += entry
    citations.push({
      index: i + 1,
      title: chunk.metadata.title,
      url: chunk.metadata.url,
      sourceType: chunk.metadata.sourceType
    })

  return { context, citations }
```

### 10.2 Prompt Integration

```
SYSTEM: You are NEXUS, an AI research copilot. Answer questions
        using the provided research context. Cite sources as
        [Source N] when referencing specific information.

CONTEXT:
[Source 1: "Attention Is All You Need"]
Transformer architecture uses self-attention mechanisms...

[Source 2: "BERT: Pre-training of Deep Bidirectional Transformers"]
BERT introduces bidirectional pre-training...

CONVERSATION HISTORY:
User: What is a transformer?
Assistant: A transformer is...

USER QUESTION:
How do attention mechanisms work in transformers?
```

---

## 11. Indexing Trigger

RAG indexing happens automatically after the research pipeline completes:

```
Research Pipeline completes
        │
        ▼
┌───────────────────────┐
│ Load all              │
│ ResearchSources       │
│ for projectId         │
└──────────┬────────────┘
           │
┌──────────▼────────────┐
│ For each source:      │
│   1. Chunk text       │
│   2. Generate embeds  │
│   3. Upsert to vector │
│      store            │
└──────────┬────────────┘
           │
┌──────────▼────────────┐
│ Log indexing stats:   │
│ - Total chunks        │
│ - Total sources       │
│ - Index time          │
└───────────────────────┘
```

---

## 12. Error Handling

| Error | Source | Handling |
|---|---|---|
| ChromaDB unavailable | Connection failure | Fall back to memory store |
| Embedding API failure | Gemini rate limit | Retry 3x with backoff |
| Empty source content | No text to chunk | Skip source, log warning |
| Context too large | Chunk overflow | Truncate at `maxContextChars` |
| No relevant chunks | Query returns nothing | Generate without RAG context |
| Collection not found | First query before index | Return empty, suggest running research |

---

## 13. Security

- Vector collections are namespaced by `projectId` — cross-project data leakage is impossible
- Query filtering uses `where: { projectId }` as a mandatory metadata filter
- Source URLs are included for citation but never fetched at query time
- ChromaDB should be on an internal network — not publicly accessible

---

## 14. Dependencies

| Component | Depends On |
|---|---|
| `rag/chroma.client.ts` | `chromadb` npm package, `config.chromaUrl` |
| `rag/embedder.ts` | `integrations/gemini.ts` → `embed()` |
| `rag/chunker.ts` | None (pure function) |
| `rag/retriever.ts` | `chroma.client.ts`, `embedder.ts` |
| `rag/pipeline.ts` | All RAG components, `aiProvider` |

---

## 15. Testing Strategy

| Test | Description | Priority |
|---|---|---|
| Chunking: basic split | 3000 char text → 3 chunks with overlap | P0 |
| Chunking: sentence boundary | Break at period, not mid-word | P1 |
| Chunking: short text | Text < chunkSize → 1 chunk | P0 |
| Embedding: mock API | Verify correct model called | P0 |
| Retrieval: cosine similarity | Known vectors → correct ranking | P0 |
| Reranking: hybrid score | Vector + keyword → reordered | P1 |
| Context assembly: char limit | Respects maxContextChars | P0 |
| Context assembly: citations | Correct source numbering | P1 |
| Memory store fallback | No ChromaDB → memory works | P0 |
| Project isolation | Query on project A → no project B results | P0 |

---

## 16. Future Improvements

1. **BM25 Integration**: Full BM25 scoring instead of simple keyword overlap
2. **Multi-Vector Representations**: ColBERT-style late interaction for better retrieval
3. **Incremental Indexing**: Index new sources without re-indexing everything
4. **TTL on Embeddings**: Auto-expire stale embeddings
5. **Embedding Cache**: Cache embeddings for repeated queries
6. **Cross-Project RAG**: Opt-in cross-project knowledge sharing
7. **User Feedback Loop**: Track which sources users find helpful → adjust relevance
8. **Chunking Strategies**: Semantic chunking based on topic boundaries
