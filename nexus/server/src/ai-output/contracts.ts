import { z, type ZodType } from 'zod';

export class AIOutputValidationError extends Error {
  constructor(
    public readonly contract: string,
    public readonly issues: string[],
    public readonly warnings: string[] = []
  ) {
    super(`Invalid AI output for ${contract}: ${issues.join('; ')}`);
    this.name = 'AIOutputValidationError';
  }
}

export interface AIOutputContract<T> {
  name: string;
  schema: ZodType<T, any, any>;
  normalize: (value: unknown, warnings: string[]) => unknown;
}

export interface ParsedAIOutput<T> {
  data: T;
  warnings: string[];
}

const stringArray = z.array(z.string().trim().min(1)).default([]);
const score = z.coerce.number().min(0).max(1);

/** Extract JSON from model text, including a conservative repair for common JSON defects. */
export const parseJsonOutput = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  const unwrapped = value.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  const start = unwrapped.search(/[\[{]/);
  const end = Math.max(unwrapped.lastIndexOf('}'), unwrapped.lastIndexOf(']'));
  const candidate = start >= 0 && end >= start ? unwrapped.slice(start, end + 1) : unwrapped;
  try {
    return JSON.parse(candidate);
  } catch {
    // Only repair trailing commas. Do not guess missing fields or semantics.
    return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1'));
  }
};

const normalizeToken = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase().replace(/[\s-]+/g, '_') : '';

export const normalizeEnum = (
  value: unknown,
  field: string,
  aliases: Record<string, string>,
  allowed: readonly string[],
  warnings: string[],
  fallback?: string
): unknown => {
  const token = normalizeToken(value);
  const normalized = aliases[token] ?? token;
  if (allowed.includes(normalized)) {
    if (normalized !== token) warnings.push(`${field}: normalized "${String(value)}" to "${normalized}"`);
    return normalized;
  }
  if (fallback) {
    warnings.push(`${field}: unknown value "${String(value)}" normalized to safe fallback "${fallback}"`);
    return fallback;
  }
  return value;
};

export const parseAIOutput = <T>(contract: AIOutputContract<T>, raw: unknown): ParsedAIOutput<T> => {
  const warnings: string[] = [];
  let parsed: unknown;
  try {
    parsed = parseJsonOutput(raw);
  } catch (error) {
    throw new AIOutputValidationError(contract.name, [`Malformed JSON: ${(error as Error).message}`]);
  }

  const result = contract.schema.safeParse(contract.normalize(parsed, warnings));
  if (!result.success) {
    throw new AIOutputValidationError(
      contract.name,
      result.error.issues.map((issue) => `${issue.path.join('.') || 'output'}: ${issue.message}`),
      warnings
    );
  }
  return { data: result.data, warnings };
};

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const mapArray = (value: unknown, fn: (item: Record<string, unknown>) => Record<string, unknown>): unknown[] =>
  Array.isArray(value) ? value.map((item) => fn(object(item))) : [];

const noOp = (value: unknown): unknown => value;

export const problemUnderstandingContract: AIOutputContract<{
  concepts: string[]; domain: string; constraints: string[]; successCriteria: string[];
  technicalRequirements: string[]; assumptions: string[];
}> = {
  name: 'ProblemUnderstandingAgent',
  schema: z.object({ concepts: stringArray, domain: z.string().trim().min(1), constraints: stringArray,
    successCriteria: stringArray, technicalRequirements: stringArray, assumptions: stringArray }),
  normalize: noOp,
};

export const queryPlannerContract: AIOutputContract<{ queries: Array<{ query: string; target: 'web' | 'academic' | 'code'; rationale: string }> }> = {
  name: 'QueryPlannerAgent',
  schema: z.object({ queries: z.array(z.object({ query: z.string().trim().min(1), target: z.enum(['web', 'academic', 'code']), rationale: z.string().trim().min(1) })).min(1).max(20) }),
  normalize: (value, warnings) => {
    const input = object(value);
    return { ...input, queries: mapArray(input.queries, (item) => ({ ...item, target: normalizeEnum(item.target, 'queries.target', { website: 'web', paper: 'academic', github: 'code' }, ['web', 'academic', 'code'], warnings) })) };
  },
};

export const researchAnalysisContract: AIOutputContract<{ claims: Array<{ claim: string; supportingSources: string[]; contradictingSources: string[]; confidence: number; category: string }>; solutions: Array<{ name: string; url?: string; description: string; category: string; features: string[]; strengths: string[]; limitations: string[]; pricingModel?: string; relevanceScore: number }> }> = {
  name: 'ResearchAnalysisAgent',
  schema: z.object({
    claims: z.array(z.object({ claim: z.string().trim().min(1), supportingSources: stringArray, contradictingSources: stringArray, confidence: score, category: z.string().trim().min(1) })),
    solutions: z.array(z.object({ name: z.string().trim().min(1), url: z.string().url().optional(), description: z.string().trim().min(1), category: z.string().trim().min(1), features: stringArray, strengths: stringArray, limitations: stringArray, pricingModel: z.string().trim().min(1).optional(), relevanceScore: score })),
  }),
  normalize: noOp,
};

const gapCategories = ['feature', 'technical', 'cost', 'ux', 'integration', 'scalability', 'user', 'research'] as const;
const levels = ['low', 'medium', 'high'] as const;

export const gapFinderContract: AIOutputContract<{ gaps: Array<{ title: string; description: string; category: typeof gapCategories[number]; impact: typeof levels[number]; difficulty: typeof levels[number]; opportunity: string; affectedSolutions: string[] }> }> = {
  name: 'GapFinderAgent',
  schema: z.object({ gaps: z.array(z.object({ title: z.string().trim().min(1), description: z.string().trim().min(1), category: z.enum(gapCategories), impact: z.enum(levels), difficulty: z.enum(levels), opportunity: z.string().trim().min(1), affectedSolutions: stringArray })) }),
  normalize: (value, warnings) => {
    const input = object(value);
    const aliases = { critical: 'high', hard: 'high', extreme: 'high', severe: 'high', moderate: 'medium', average: 'medium', normal: 'medium', easy: 'low', simple: 'low', minor: 'low' };
    return { ...input, gaps: mapArray(input.gaps, (gap) => ({ ...gap,
      category: normalizeEnum(gap.category, 'gaps.category', { user_experience: 'ux', userexperience: 'ux', performance: 'technical' }, gapCategories, warnings),
      impact: normalizeEnum(gap.impact, 'gaps.impact', aliases, levels, warnings, 'medium'),
      difficulty: normalizeEnum(gap.difficulty, 'gaps.difficulty', aliases, levels, warnings, 'medium'),
    })) };
  },
};

export const criticContract: AIOutputContract<{ critiques: Array<{ area: string; issue: string; severity: 'minor' | 'major' | 'critical'; suggestion: string }>; overallAssessment: string; confidenceScore: number }> = {
  name: 'CriticAgent',
  schema: z.object({ critiques: z.array(z.object({ area: z.string().trim().min(1), issue: z.string().trim().min(1), severity: z.enum(['minor', 'major', 'critical']), suggestion: z.string().trim().min(1) })), overallAssessment: z.string().trim().min(1), confidenceScore: score }),
  normalize: noOp,
};

export const architectureContract: AIOutputContract<{ overview: string; components: Array<{ name: string; description: string; technology: string; responsibilities: string[] }>; dataFlow: string; deploymentModel: string; scalabilityNotes: string; recommendations: Array<{ category: string; name: string; rationale: string; alternatives: string[] }> }> = {
  name: 'ArchitectAgent',
  schema: z.object({ overview: z.string().trim().min(1), components: z.array(z.object({ name: z.string().trim().min(1), description: z.string().trim().min(1), technology: z.string().trim().min(1), responsibilities: stringArray })), dataFlow: z.string().trim().min(1), deploymentModel: z.string().trim().min(1), scalabilityNotes: z.string().trim().min(1), recommendations: z.array(z.object({ category: z.string().trim().min(1), name: z.string().trim().min(1), rationale: z.string().trim().min(1), alternatives: stringArray })) }),
  normalize: noOp,
};

export const roadmapContract: AIOutputContract<{ phases: Array<{ phase: number; title: string; duration: string; milestones: string[]; deliverables: string[]; dependencies: string[] }>; totalDuration: string; criticalPath: string[]; risks: Array<{ risk: string; mitigation: string; probability: typeof levels[number]; impact: typeof levels[number] }> }> = {
  name: 'RoadmapAgent',
  schema: z.object({ phases: z.array(z.object({ phase: z.coerce.number().int().positive(), title: z.string().trim().min(1), duration: z.string().trim().min(1), milestones: stringArray, deliverables: stringArray, dependencies: stringArray })).min(1), totalDuration: z.string().trim().min(1), criticalPath: stringArray, risks: z.array(z.object({ risk: z.string().trim().min(1), mitigation: z.string().trim().min(1), probability: z.enum(levels), impact: z.enum(levels) })) }),
  normalize: (value, warnings) => {
    const input = object(value);
    const aliases = { critical: 'high', hard: 'high', extreme: 'high', moderate: 'medium', average: 'medium', easy: 'low', simple: 'low', minor: 'low' };
    return { ...input, risks: mapArray(input.risks, (risk) => ({ ...risk, probability: normalizeEnum(risk.probability, 'risks.probability', aliases, levels, warnings, 'medium'), impact: normalizeEnum(risk.impact, 'risks.impact', aliases, levels, warnings, 'medium') })) };
  },
};
