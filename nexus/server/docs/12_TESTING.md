# 12 — Testing Strategy

> **Scope:** Testing architecture — test pyramid, tooling, coverage targets, test patterns for every layer, mocking strategy, and CI integration.

---

## 1. Purpose

Define a comprehensive testing strategy for NEXUS so that every module has appropriate test coverage, every new feature ships with tests, and regressions are caught before they reach production. No code changes should be merged without passing the test suite.

---

## 2. Test Pyramid

```
                    ┌───────────┐
                    │   E2E     │  ← Few, slow, high-confidence
                    │ (5-10%)   │
                    ├───────────┤
                    │Integration│  ← Moderate count, test real flows
                    │ (30-40%)  │
                    ├───────────┤
                    │   Unit    │  ← Many, fast, isolated
                    │ (50-60%)  │
                    └───────────┘
```

---

## 3. Tooling

| Tool | Purpose | Config |
|---|---|---|
| **Vitest** | Test runner + assertions | `vitest.config.ts` |
| **Supertest** | HTTP integration testing | Test helper |
| **mongodb-memory-server** | In-memory MongoDB for tests | Test setup |
| **MSW (Mock Service Worker)** | Mock external API responses | Test helper |
| **c8 / istanbul** | Code coverage | Via Vitest |

### 3.1 NPM Scripts (Planned)

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:integration": "vitest run --config vitest.integration.config.ts",
  "test:e2e": "vitest run --config vitest.e2e.config.ts"
}
```

---

## 4. Test Directory Structure

```
server/
├── src/
│   └── ...
├── tests/
│   ├── setup.ts                    # Global test setup (DB, env)
│   ├── helpers/
│   │   ├── auth.helper.ts          # createTestUser(), getAuthToken()
│   │   ├── db.helper.ts            # clearDB(), seedDB()
│   │   └── request.helper.ts       # Supertest wrapper
│   ├── unit/
│   │   ├── utils/
│   │   │   ├── jwt.test.ts
│   │   │   ├── safeFetch.test.ts
│   │   │   ├── retry.test.ts
│   │   │   └── asyncHandler.test.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.test.ts
│   │   │   ├── projectAuth.test.ts
│   │   │   ├── validate.test.ts
│   │   │   └── errorHandler.test.ts
│   │   ├── models/
│   │   │   ├── User.test.ts
│   │   │   ├── Project.test.ts
│   │   │   └── ResearchJob.test.ts
│   │   ├── providers/
│   │   │   ├── serper.provider.test.ts
│   │   │   ├── github.provider.test.ts
│   │   │   ├── arxiv.provider.test.ts
│   │   │   └── semanticScholar.provider.test.ts
│   │   └── research/
│   │       └── deduplicator.test.ts
│   ├── integration/
│   │   ├── auth.test.ts            # Full auth flow
│   │   ├── project.test.ts         # Project CRUD + members
│   │   ├── research.test.ts        # Research endpoints
│   │   └── copilot.test.ts         # Copilot chat
│   └── e2e/
│       ├── research-pipeline.test.ts  # Full pipeline run
│       └── user-journey.test.ts       # Register → Create → Research
```

---

## 5. Layer-Specific Test Patterns

### 5.1 Utility Tests (Unit)

```typescript
// tests/unit/utils/jwt.test.ts
describe('jwt', () => {
  describe('generateAccessToken', () => {
    it('creates a valid JWT with userId and email', () => {
      const token = generateAccessToken({ userId: '123', email: 'test@test.com' });
      const decoded = jwt.verify(token, config.jwt.secret);
      expect(decoded.userId).toBe('123');
    });

    it('expires in 15 minutes', () => {
      const token = generateAccessToken({ userId: '123', email: 'a@b.com' });
      const decoded = jwt.decode(token);
      expect(decoded.exp - decoded.iat).toBe(900); // 15 * 60
    });
  });

  describe('verifyToken', () => {
    it('returns payload for valid token', () => { ... });
    it('throws for expired token', () => { ... });
    it('throws for wrong secret', () => { ... });
  });
});
```

### 5.2 Middleware Tests (Unit)

```typescript
// tests/unit/middleware/auth.middleware.test.ts
describe('verifyAuth', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = { headers: {} };
    res = {};
    next = vi.fn();
  });

  it('calls next with 401 when no Authorization header', async () => {
    await verifyAuth(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 })
    );
  });

  it('attaches user to req on valid token', async () => {
    const token = generateAccessToken({ userId: testUser._id, email: testUser.email });
    req.headers = { authorization: `Bearer ${token}` };
    await verifyAuth(req as Request, res as Response, next);
    expect(req.user).toBeDefined();
    expect(req.user._id).toEqual(testUser._id);
    expect(next).toHaveBeenCalledWith(); // no error
  });
});
```

### 5.3 Model Tests (Unit)

```typescript
// tests/unit/models/User.test.ts
describe('User model', () => {
  it('hashes password on save', async () => {
    const user = await User.create({ name: 'Test', email: 'a@b.com', password: 'plain123' });
    expect(user.password).not.toBe('plain123');
    expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt prefix
  });

  it('excludes password and refreshToken by default', async () => {
    await User.create({ name: 'Test', email: 'a@b.com', password: 'test1234' });
    const user = await User.findOne({ email: 'a@b.com' });
    expect(user.password).toBeUndefined();
    expect(user.refreshToken).toBeUndefined();
  });

  it('comparePassword returns true for correct password', async () => {
    const user = await User.create({ name: 'Test', email: 'a@b.com', password: 'secure123' });
    const fullUser = await User.findById(user._id).select('+password');
    expect(await fullUser.comparePassword('secure123')).toBe(true);
    expect(await fullUser.comparePassword('wrong')).toBe(false);
  });
});
```

### 5.4 Provider Tests (Unit, Mocked)

```typescript
// tests/unit/providers/serper.provider.test.ts
describe('SerperProvider', () => {
  const provider = new SerperProvider();

  it('returns empty array when not configured', async () => {
    // config.serperApiKey is empty
    const results = await provider.search('test query');
    expect(results).toEqual([]);
  });

  it('maps Serper response to NormalizedSource', async () => {
    // MSW mock for google.serper.dev/search
    const results = await provider.search('machine learning');
    expect(results[0]).toMatchObject({
      provider: 'serper',
      sourceType: 'web',
      title: expect.any(String),
      url: expect.any(String),
      relevanceScore: expect.any(Number),
    });
  });

  it('returns empty array on API error', async () => {
    // MSW mock returns 500
    const results = await provider.search('query');
    expect(results).toEqual([]);
  });
});
```

### 5.5 Integration Tests (Supertest)

```typescript
// tests/integration/auth.test.ts
describe('Auth API', () => {
  describe('POST /api/v1/auth/register', () => {
    it('creates user and returns tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe('test@example.com');
      expect(res.body.data.user.password).toBeUndefined(); // never returned
    });

    it('returns 409 for duplicate email', async () => {
      await createTestUser({ email: 'dup@test.com' });
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Dup', email: 'dup@test.com', password: 'password123' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });
});
```

### 5.6 E2E Tests

```typescript
// tests/e2e/user-journey.test.ts
describe('User Journey: Register → Create Project → Start Research', () => {
  let accessToken: string;
  let projectId: string;

  it('registers a new user', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({...});
    accessToken = res.body.data.accessToken;
  });

  it('creates a project', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Test Project', description: 'A test project for e2e' });
    projectId = res.body.data._id;
  });

  it('starts research', async () => {
    const res = await request(app)
      .post(`/api/v1/research/${projectId}/start`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
    expect(res.status).toBe(202);
  });
});
```

---

## 6. Test Helpers

### 6.1 Database Setup

```typescript
// tests/setup.ts
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
```

### 6.2 Auth Helper

```typescript
// tests/helpers/auth.helper.ts
export async function createTestUser(overrides = {}) {
  return User.create({
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    ...overrides
  });
}

export async function getAuthToken(user: UserDocument) {
  return generateAccessToken({ userId: user._id.toString(), email: user.email });
}
```

---

## 7. Coverage Targets

| Layer | Target | Rationale |
|---|---|---|
| Utilities | 95% | Pure functions, easy to test |
| Middleware | 90% | Critical security layer |
| Models | 85% | Schema validation + hooks |
| Controllers | 80% | Via integration tests |
| Providers | 80% | With mocked HTTP |
| Routes | 75% | Via integration tests |
| Orchestrator | 70% | Complex, AI-dependent |
| Overall | **80%** | Minimum for merge |

---

## 8. Mocking Strategy

| Dependency | Mock Approach |
|---|---|
| MongoDB | `mongodb-memory-server` (real Mongoose, in-memory DB) |
| Redis | `ioredis-mock` or skip (optional dependency) |
| Gemini AI | Mock `AIProvider` interface implementation |
| External APIs | MSW (Mock Service Worker) interceptors |
| `safeFetch` | Mock at module level for unit tests |
| Time/Date | `vi.useFakeTimers()` for TTL/expiry tests |
| Logger | Mock to suppress output, verify log calls |

---

## 9. CI Integration

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 18 }
      - run: npm ci
      - run: npm run test:coverage
      - name: Check coverage threshold
        run: |
          npx c8 check-coverage --lines 80 --branches 70 --functions 75
```

---

## 10. Testing Best Practices

1. **Arrange-Act-Assert**: Every test follows AAA pattern
2. **One assertion focus**: Each test verifies one behavior
3. **Descriptive names**: `it('returns 401 when token is expired')`
4. **No test interdependence**: Each test runs in isolation
5. **Clean state**: `afterEach` clears DB and mocks
6. **No network calls**: All external APIs mocked
7. **Fast execution**: Unit tests < 100ms each
8. **Deterministic**: No flaky tests — mock time, randomness, network

---

## 11. Future Improvements

1. **Snapshot Testing**: For complex API response shapes
2. **Property-Based Testing**: Fuzz Zod schemas with random inputs
3. **Load Testing**: k6 or Artillery for API performance testing
4. **Contract Testing**: Pact for frontend-backend contract verification
5. **Visual Regression**: For frontend component testing
6. **Mutation Testing**: Stryker.js to verify test quality
7. **Test Reporting**: HTML coverage reports in CI artifacts
8. **Pre-commit Hooks**: Run affected tests on commit
