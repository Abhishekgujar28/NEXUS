import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../../src/utils/jwt.js';
import { config } from '../../src/core/config.js';

describe('JWT Utilities Unit Tests', () => {
  const userId = '507f1f77bcf86cd799439011';
  const email = 'unitTest@nexus.io';

  it('should generate a valid access token and verify it', () => {
    // Ensure JWT secret is set for standalone test environment
    if (!config.jwt.secret) {
      (config.jwt as any).secret = 'test_secret_key_32_characters_long_12345';
    }

    const token = generateAccessToken({ userId, email });
    assert.ok(typeof token === 'string' && token.length > 0);

    const decoded = verifyToken(token);
    assert.strictEqual(decoded.userId, userId);
    assert.strictEqual(decoded.email, email);
  });

  it('should generate a valid refresh token and verify it', () => {
    if (!config.jwt.refreshSecret) {
      (config.jwt as any).refreshSecret = 'test_refresh_secret_key_32_chars_12345';
    }

    const refreshToken = generateRefreshToken({ userId });
    assert.ok(typeof refreshToken === 'string' && refreshToken.length > 0);

    const decoded = verifyToken(refreshToken, true);
    assert.strictEqual(decoded.userId, userId);
  });

  it('should throw an error for an invalid token string', () => {
    assert.throws(() => {
      verifyToken('invalid.jwt.token');
    });
  });
});
