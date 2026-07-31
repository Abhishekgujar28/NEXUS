import test from 'node:test';
import assert from 'node:assert/strict';
import { AIOutputValidationError, gapFinderContract, parseAIOutput } from '../../src/ai-output/contracts.js';

const gap = (impact: unknown, difficulty: unknown) => ({ gaps: [{
  title: 'Gap', description: 'A meaningful unmet need', category: 'feature', impact, difficulty,
  opportunity: 'Build it', affectedSolutions: [],
}] });

test('normalizes critical and hard gap levels before persistence', () => {
  const result = parseAIOutput(gapFinderContract, gap('critical', 'hard'));
  assert.equal(result.data.gaps[0].impact, 'high');
  assert.equal(result.data.gaps[0].difficulty, 'high');
  assert.equal(result.warnings.length, 2);
});

test('normalizes moderate, easy, simple, and minor safely', () => {
  assert.equal(parseAIOutput(gapFinderContract, gap('moderate', 'easy')).data.gaps[0].impact, 'medium');
  assert.equal(parseAIOutput(gapFinderContract, gap('minor', 'simple')).data.gaps[0].difficulty, 'low');
});

test('unknown enum values use the explicit safe fallback and emit a warning', () => {
  const result = parseAIOutput(gapFinderContract, gap('catastrophic', 'impossible'));
  assert.equal(result.data.gaps[0].impact, 'medium');
  assert.equal(result.data.gaps[0].difficulty, 'medium');
  assert.equal(result.warnings.length, 2);
});

test('repairs a recoverable trailing comma in JSON model output', () => {
  const raw = JSON.stringify(gap('high', 'low')).replace('}]}}', '},]}}');
  const result = parseAIOutput(gapFinderContract, raw);
  assert.equal(result.data.gaps.length, 1);
});

test('rejects malformed JSON and required-field omissions before Mongoose', () => {
  assert.throws(() => parseAIOutput(gapFinderContract, '{not json'), AIOutputValidationError);
  assert.throws(() => parseAIOutput(gapFinderContract, { gaps: [{ impact: 'high' }] }), AIOutputValidationError);
});

test('normalizes empty or invalid solution URLs safely without throwing', () => {
  const { researchAnalysisContract } = require('../../src/ai-output/contracts.js');
  const raw = {
    claims: [],
    solutions: [
      {
        name: 'Test Solution 1',
        url: '',
        description: 'Solution with empty URL',
        category: 'competitor',
        features: ['f1'],
        strengths: ['s1'],
        limitations: ['l1'],
        relevanceScore: 0.8,
      },
      {
        name: 'Test Solution 2',
        url: 'N/A',
        description: 'Solution with N/A URL',
        category: 'open_source',
        features: ['f2'],
        strengths: ['s2'],
        limitations: ['l2'],
        relevanceScore: 0.9,
      },
      {
        name: 'Test Solution 3',
        url: 'https://example.com',
        description: 'Solution with valid URL',
        category: 'framework',
        features: ['f3'],
        strengths: ['s3'],
        limitations: ['l3'],
        relevanceScore: 0.95,
      },
    ],
  };

  const result = parseAIOutput(researchAnalysisContract, raw);
  assert.equal(result.data.solutions[0].url, undefined);
  assert.equal(result.data.solutions[1].url, undefined);
  assert.equal(result.data.solutions[2].url, 'https://example.com/');
});
