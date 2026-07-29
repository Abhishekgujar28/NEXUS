import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';
import { retry } from '../utils/retry.js';
import { AIProvider, AIProviderNotConfiguredError } from './AIProvider.js';

const GEN_MODEL = 'gemini-1.5-flash';
const EMBED_MODEL = 'text-embedding-004';

/**
 * Extract the first balanced JSON object/array from a model response,
 * tolerating markdown code fences and surrounding prose.
 */
const extractJson = (text: string): string => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const firstBrace = text.search(/[[{]/);
  if (firstBrace === -1) return text.trim();
  return text.slice(firstBrace).trim();
};

export class GeminiProvider implements AIProvider {
  readonly name = 'Gemini';
  private client: GoogleGenerativeAI | null;

  constructor() {
    this.client = config.geminiApiKey ? new GoogleGenerativeAI(config.geminiApiKey) : null;
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  private ensure(): GoogleGenerativeAI {
    if (!this.client) throw new AIProviderNotConfiguredError(this.name);
    return this.client;
  }

  async generate(prompt: string, system?: string): Promise<string> {
    const model = this.ensure().getGenerativeModel({
      model: GEN_MODEL,
      ...(system ? { systemInstruction: system } : {}),
    });
    return retry(async () => {
      const res = await model.generateContent(prompt);
      return res.response.text();
    });
  }

  async generateStructured<T>(prompt: string, system?: string): Promise<T> {
    const model = this.ensure().getGenerativeModel({
      model: GEN_MODEL,
      generationConfig: { responseMimeType: 'application/json' },
      ...(system ? { systemInstruction: system } : {}),
    });
    return retry(async () => {
      const res = await model.generateContent(prompt);
      const raw = res.response.text();
      try {
        return JSON.parse(extractJson(raw)) as T;
      } catch (err) {
        logger.warn('Gemini returned malformed JSON, retrying', { snippet: raw.slice(0, 200) });
        throw err;
      }
    }, 3);
  }

  async embed(text: string): Promise<number[]> {
    const model = this.ensure().getGenerativeModel({ model: EMBED_MODEL });
    return retry(async () => {
      const res = await model.embedContent(text);
      return res.embedding.values;
    });
  }
}

export const aiProvider: AIProvider = new GeminiProvider();
