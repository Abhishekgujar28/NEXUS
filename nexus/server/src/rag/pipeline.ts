import ResearchSource from '../models/ResearchSource.js';
import { chunkSource } from './chunker.js';
import { embedBatch } from './embedder.js';
import { upsertChunks } from './chroma.client.js';
import { retrieveAndRerank, RankedChunk } from './retriever.js';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';

export interface Citation {
  index: number;
  title: string;
  url: string;
  sourceType: string;
}

export interface RagContextResult {
  context: string;
  citations: Citation[];
  rankedChunks: RankedChunk[];
}

/**
 * Index all persisted ResearchSource documents for a project into the Vector Store.
 * Called automatically upon completion of the research pipeline.
 */
export const indexResearchSources = async (projectId: string): Promise<number> => {
  logger.info(`Starting RAG indexing for project [${projectId}]`);

  const sources = await ResearchSource.find({ projectId }).lean();
  if (sources.length === 0) {
    logger.info(`No ResearchSources found to index for project [${projectId}]`);
    return 0;
  }

  // 1. Chunk all sources
  const allChunks = sources.flatMap((src) =>
    chunkSource({
      _id: src._id.toString(),
      projectId: src.projectId.toString(),
      sourceType: src.sourceType,
      title: src.title,
      url: src.url || '',
      provider: src.provider,
      relevanceScore: src.relevanceScore,
      snippet: src.snippet ?? undefined,
      content: src.content ?? undefined,
    })
  );

  if (allChunks.length === 0) {
    logger.info(`0 chunks generated for project [${projectId}]`);
    return 0;
  }

  // 2. Generate embeddings in batches
  const embeddedChunks = await embedBatch(allChunks);

  // 3. Upsert to Vector Store
  await upsertChunks(projectId, embeddedChunks);

  logger.info(`Successfully indexed ${embeddedChunks.length} chunks for project [${projectId}]`);
  return embeddedChunks.length;
};

/**
 * Retrieve relevant research context for a query and assemble formatted text with citations.
 */
export const assembleRagContext = async (
  projectId: string,
  queryText: string
): Promise<RagContextResult> => {
  const maxContextChars = config.rag.maxContextChars;

  const rankedChunks = await retrieveAndRerank(projectId, queryText);
  if (rankedChunks.length === 0) {
    return { context: '', citations: [], rankedChunks: [] };
  }

  let contextText = '';
  const citations: Citation[] = [];

  for (let i = 0; i < rankedChunks.length; i++) {
    const chunk = rankedChunks[i];
    const citationIndex = i + 1;
    const citationHeader = `[Source ${citationIndex}: ${chunk.metadata.title}]`;
    const entry = `${citationHeader}\nURL: ${chunk.metadata.url}\n${chunk.text}\n\n`;

    if (contextText.length + entry.length > maxContextChars) {
      break;
    }

    contextText += entry;
    citations.push({
      index: citationIndex,
      title: chunk.metadata.title,
      url: chunk.metadata.url,
      sourceType: chunk.metadata.sourceType,
    });
  }

  return {
    context: contextText.trim(),
    citations,
    rankedChunks,
  };
};
