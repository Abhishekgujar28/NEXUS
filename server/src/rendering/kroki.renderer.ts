import axios from 'axios';
import zlib from 'zlib';
import { logger } from '../core/logger.js';

const KROKI_BASE_URL = process.env.KROKI_URL || 'https://kroki.io';

/**
 * Encodes diagram source string for Kroki GET API requests
 * using zlib deflate compression + base64url encoding.
 */
export const encodeKrokiDiagram = (source: string): string => {
  const compressed = zlib.deflateSync(Buffer.from(source, 'utf8'));
  return compressed.toString('base64url');
};

export const renderKrokiDiagram = async (
  mermaidSource: string,
  outputFormat: 'svg' | 'png' | 'pdf',
  timeoutMs: number = 3500
): Promise<Buffer> => {
  try {
    // 1. Try GET request with zlib deflated base64url encoded diagram URL
    // Format: https://kroki.io/mermaid/{outputFormat}/{encoded}
    const encoded = encodeKrokiDiagram(mermaidSource);
    const getUrl = `${KROKI_BASE_URL}/mermaid/${outputFormat}/${encoded}`;

    const response = await axios.get(getUrl, {
      responseType: 'arraybuffer',
      timeout: timeoutMs,
    });
    return Buffer.from(response.data);
  } catch (err) {
    // 2. Fallback to POST request with raw text body
    try {
      const postUrl = `${KROKI_BASE_URL}/mermaid/${outputFormat}`;
      const response = await axios.post(postUrl, mermaidSource, {
        headers: { 'Content-Type': 'text/plain' },
        responseType: 'arraybuffer',
        timeout: timeoutMs,
      });
      return Buffer.from(response.data);
    } catch (fallbackErr) {
      logger.warn(`Kroki rendering error (${outputFormat})`, { error: (err as Error).message });
      throw err;
    }
  }
};
