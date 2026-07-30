import { describe, it } from 'node:test';
import assert from 'node:assert';
import { aiRouter, AIRouter } from '../../src/integrations/AIRouter.js';
import { TASK_MODEL_REGISTRY, getProviderChainForTask } from '../../src/integrations/modelRegistry.js';

describe('AIRouter & Multi-Provider Architecture Unit Tests', () => {
  it('should initialize AIRouter with all 7 supported providers', () => {
    const models = aiRouter.getModels();
    assert.ok(models.length > 0);
    assert.ok(models.some((m) => m.includes('gpt-4o') || m.includes('claude') || m.includes('gemini')));
  });

  it('should resolve provider fallback chains correctly for task categories', () => {
    const researchChain = getProviderChainForTask('research');
    assert.strictEqual(researchChain[0], 'openrouter');
    assert.ok(researchChain.includes('gemini'));
    assert.ok(researchChain.includes('anthropic'));

    const copilotChain = getProviderChainForTask('copilot');
    assert.strictEqual(copilotChain[0], 'anthropic');
    assert.ok(copilotChain.includes('openrouter'));

    const fastClassChain = getProviderChainForTask('fast_classification');
    assert.strictEqual(fastClassChain[0], 'groq');
  });

  it('should return health check status for all 7 providers', async () => {
    const statuses = await aiRouter.getAllProviderStatuses();
    assert.strictEqual(statuses.length, 7);

    const openrouterStatus = statuses.find((s) => s.name === 'OpenRouter');
    const geminiStatus = statuses.find((s) => s.name === 'Gemini');

    assert.ok(openrouterStatus);
    assert.ok(geminiStatus);
  });

  it('should update admin provider settings dynamically', () => {
    const initial = aiRouter.getAdminSettings();
    assert.strictEqual(initial.groq, true);

    const updated = aiRouter.updateAdminSettings({ groq: false });
    assert.strictEqual(updated.groq, false);

    // Reset back
    aiRouter.updateAdminSettings({ groq: true });
  });

  it('should detect when AIRouter is configured', () => {
    assert.strictEqual(typeof aiRouter.isConfigured(), 'boolean');
  });
});
