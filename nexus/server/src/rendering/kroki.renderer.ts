import axios from 'axios';
import { logger } from '../core/logger.js';

const KROKI_BASE_URL = process.env.KROKI_URL || 'https://kroki.io';

export const renderKrokiDiagram = async (
  mermaidSource: string,
  outputFormat: 'svg' | 'png' | 'pdf'
): Promise<Buffer> => {
  try {
    const url = `${KROKI_BASE_URL}/mermaid/${outputFormat}`;
    const response = await axios.post(url, mermaidSource, {
      headers: { 'Content-Type': 'text/plain' },
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    return Buffer.from(response.data);
  } catch (err) {
    logger.warn(`Kroki rendering error (${outputFormat})`, { error: (err as Error).message });
    throw err;
  }
};
