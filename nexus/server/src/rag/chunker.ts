import { config } from '../core/config.js';

export interface ChunkMetadata {
  projectId: string;
  sourceId: string;
  chunkIndex: number;
  sourceType: string;
  title: string;
  url: string;
  provider: string;
  relevanceScore: number;
}

export interface ChunkData {
  id: string;
  text: string;
  metadata: ChunkMetadata;
}

export interface SourceInput {
  _id: string;
  projectId: string;
  sourceType: string;
  title: string;
  url: string;
  provider: string;
  relevanceScore?: number;
  snippet?: string;
  content?: string;
}

/**
 * Sliding window text chunking algorithm.
 * Splits source text into overlapping chunks, attempting to break at sentence boundaries.
 */
export const chunkSource = (source: SourceInput): ChunkData[] => {
  const chunkSize = config.rag.chunkSize;
  const chunkOverlap = config.rag.chunkOverlap;

  const rawText = source.content && source.content.trim().length > 0
    ? source.content
    : source.snippet || '';

  const textToChunk = source.title?.trim()
    ? `[${source.sourceType.toUpperCase()}] ${source.title}\n${rawText}`
    : rawText;

  if (!textToChunk.trim()) {
    return [];
  }

  const chunks: ChunkData[] = [];
  let position = 0;
  let chunkIndex = 0;

  while (position < textToChunk.length) {
    let end = Math.min(position + chunkSize, textToChunk.length);

    // Try to break at a sentence boundary if possible
    if (end < textToChunk.length) {
      const sentenceEnd = textToChunk.lastIndexOf('.', end);
      if (sentenceEnd > position + Math.floor(chunkSize / 2)) {
        end = sentenceEnd + 1;
      }
    }

    const chunkText = textToChunk.slice(position, end).trim();

    if (chunkText.length > 0) {
      chunks.push({
        id: `${source._id.toString()}_chunk_${chunkIndex}`,
        text: chunkText,
        metadata: {
          projectId: source.projectId.toString(),
          sourceId: source._id.toString(),
          chunkIndex,
          sourceType: source.sourceType,
          title: source.title,
          url: source.url,
          provider: source.provider,
          relevanceScore: source.relevanceScore ?? 0.5,
        },
      });
      chunkIndex++;
    }

    position = end - chunkOverlap;
    if (position >= textToChunk.length || end === textToChunk.length) {
      break;
    }
  }

  return chunks;
};
