# 13 — Postman Collection Reference

> **Scope:** Complete API testing collection — every endpoint with example requests, environment variables, pre-request scripts, and test assertions. This document serves as the specification for generating a Postman/Insomnia/Bruno collection.

---

## 1. Purpose

Provide a ready-to-use API testing reference for every NEXUS endpoint. This document can be imported as-is into Postman or used as a blueprint for creating collections in any API client.

---

## 2. Environment Variables

| Variable | Dev Value | Description |
|---|---|---|
| `baseUrl` | `http://localhost:5000` | Server base URL |
| `apiBase` | `{{baseUrl}}/api/v1` | API prefix |
| `accessToken` | *(auto-set by login)* | Current access token |
| `refreshToken` | *(auto-set by login)* | Current refresh token |
| `projectId` | *(auto-set by create)* | Active project ID |
| `userId` | *(auto-set by register)* | Current user ID |
| `memberEmail` | `collaborator@example.com` | Test collaborator email |

---

## 3. Collection Structure

```
NEXUS API Collection
├── 🏥 Health
│   └── GET  Health Check
├── 🔐 Auth
│   ├── POST Register
│   ├── POST Login
│   ├── POST Refresh Token
│   ├── POST Logout
│   └── GET  Get Me
├── 📁 Projects
│   ├── POST Create Project
│   ├── GET  List Projects
│   ├── GET  Get Project
│   ├── PUT  Update Project
│   ├── DEL  Delete Project
│   ├── GET  Get Project Stats
│   ├── POST Add Member
│   └── DEL  Remove Member
├── 🔬 Research
│   ├── POST Start Research
│   ├── GET  Get Job Status
│   ├── GET  Get Sources
│   ├── GET  Get Evidence
│   ├── GET  Get Solutions
│   ├── GET  Get Gaps
│   ├── GET  Get Architecture
│   ├── GET  Get Resources
│   ├── GET  Get Roadmap
│   └── POST Stress Test
└── 🤖 Copilot
    ├── POST Chat
    ├── GET  List Conversations
    └── GET  Get History
```

---

## 4. Request Specifications

### 4.1 Health Check

```
GET {{baseUrl}}/health

Headers: (none required)

Expected Response (200):
{
  "success": true,
  "data": { "status": "ok" }
}

Tests:
  pm.test("Status 200", () => pm.response.to.have.status(200));
  pm.test("Status ok", () => pm.expect(pm.response.json().data.status).to.eql("ok"));
```

---

### 4.2 Auth — Register

```
POST {{apiBase}}/auth/register

Headers:
  Content-Type: application/json

Body:
{
  "name": "Test User",
  "email": "testuser@nexus.io",
  "password": "SecurePass123!"
}

Expected Response (201):
{
  "success": true,
  "data": {
    "user": { "_id": "...", "email": "testuser@nexus.io", "name": "Test User" },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}

Post-Response Script:
  const data = pm.response.json().data;
  pm.environment.set("accessToken", data.accessToken);
  pm.environment.set("refreshToken", data.refreshToken);
  pm.environment.set("userId", data.user._id);

Tests:
  pm.test("Status 201", () => pm.response.to.have.status(201));
  pm.test("Has tokens", () => {
    pm.expect(pm.response.json().data.accessToken).to.be.a("string");
    pm.expect(pm.response.json().data.refreshToken).to.be.a("string");
  });
  pm.test("No password in response", () => {
    pm.expect(pm.response.json().data.user.password).to.be.undefined;
  });
```

---

### 4.3 Auth — Login

```
POST {{apiBase}}/auth/login

Body:
{
  "email": "testuser@nexus.io",
  "password": "SecurePass123!"
}

Post-Response Script:
  const data = pm.response.json().data;
  pm.environment.set("accessToken", data.accessToken);
  pm.environment.set("refreshToken", data.refreshToken);
```

---

### 4.4 Auth — Refresh Token

```
POST {{apiBase}}/auth/refresh

Body:
{
  "refreshToken": "{{refreshToken}}"
}

Post-Response Script:
  const data = pm.response.json().data;
  pm.environment.set("accessToken", data.accessToken);
  pm.environment.set("refreshToken", data.refreshToken);
```

---

### 4.5 Auth — Logout

```
POST {{apiBase}}/auth/logout

Headers:
  Authorization: Bearer {{accessToken}}

Expected Response (200):
{
  "success": true,
  "data": { "message": "Logged out" }
}
```

---

### 4.6 Auth — Get Me

```
GET {{apiBase}}/auth/me

Headers:
  Authorization: Bearer {{accessToken}}

Expected Response (200):
{
  "success": true,
  "data": {
    "user": { "_id": "...", "email": "...", "name": "..." }
  }
}

Tests:
  pm.test("No password field", () => {
    pm.expect(pm.response.json().data.user.password).to.be.undefined;
  });
  pm.test("No refreshToken field", () => {
    pm.expect(pm.response.json().data.user.refreshToken).to.be.undefined;
  });
```

---

### 4.7 Projects — Create

```
POST {{apiBase}}/projects

Headers:
  Authorization: Bearer {{accessToken}}
  Content-Type: application/json

Body:
{
  "title": "AI Health Monitor",
  "description": "An AI-powered health monitoring system that uses wearable device data to predict health risks and provide personalized recommendations.",
  "domain": "healthcare",
  "projectType": "web application",
  "targetUsers": "patients, doctors",
  "platform": "web, mobile",
  "preferredTech": ["React", "Node.js", "TensorFlow"],
  "constraints": "HIPAA compliance required",
  "teamSize": 4,
  "timeline": "6 months",
  "skillLevel": "advanced",
  "tags": ["ai", "health", "wearables", "machine-learning"]
}

Post-Response Script:
  pm.environment.set("projectId", pm.response.json().data._id);

Tests:
  pm.test("Status 201", () => pm.response.to.have.status(201));
  pm.test("Status is draft", () => {
    pm.expect(pm.response.json().data.status).to.eql("draft");
  });
```

---

### 4.8 Projects — List

```
GET {{apiBase}}/projects?page=1&limit=10

Headers:
  Authorization: Bearer {{accessToken}}

Tests:
  pm.test("Returns array", () => {
    const body = pm.response.json();
    pm.expect(body.data.items).to.be.an("array");
    pm.expect(body.data.pagination).to.have.property("total");
  });
```

---

### 4.9 Projects — Get / Update / Delete / Stats

```
GET    {{apiBase}}/projects/{{projectId}}         ← Auth: Bearer
PUT    {{apiBase}}/projects/{{projectId}}         ← Body: { "title": "Updated Title" }
DELETE {{apiBase}}/projects/{{projectId}}         ← Auth: Bearer (owner only)
GET    {{apiBase}}/projects/{{projectId}}/stats   ← Auth: Bearer
```

---

### 4.10 Projects — Add Member

```
POST {{apiBase}}/projects/{{projectId}}/members

Headers:
  Authorization: Bearer {{accessToken}}

Body:
{
  "email": "{{memberEmail}}",
  "role": "editor"
}

Tests:
  pm.test("Status 201", () => pm.response.to.have.status(201));
  pm.test("Role is editor", () => {
    pm.expect(pm.response.json().data.role).to.eql("editor");
  });
```

---

### 4.11 Research — Start

```
POST {{apiBase}}/research/{{projectId}}/start

Headers:
  Authorization: Bearer {{accessToken}}

Body:
{
  "force": false
}

Expected Response (202):
{
  "success": true,
  "data": {
    "jobId": "...",
    "status": "queued"
  }
}

Tests:
  pm.test("Status 202", () => pm.response.to.have.status(202));
  pm.test("Status is queued", () => {
    pm.expect(pm.response.json().data.status).to.eql("queued");
  });
```

---

### 4.12 Research — Get Job / Sources / Evidence / Solutions / Gaps

```
GET {{apiBase}}/research/{{projectId}}/job
GET {{apiBase}}/research/{{projectId}}/sources?page=1&limit=20
GET {{apiBase}}/research/{{projectId}}/evidence
GET {{apiBase}}/research/{{projectId}}/solutions
GET {{apiBase}}/research/{{projectId}}/gaps
GET {{apiBase}}/research/{{projectId}}/architecture
GET {{apiBase}}/research/{{projectId}}/resources
GET {{apiBase}}/research/{{projectId}}/roadmap

All require:
  Authorization: Bearer {{accessToken}}
```

---

### 4.13 Copilot — Chat

```
POST {{apiBase}}/copilot/{{projectId}}/chat

Headers:
  Authorization: Bearer {{accessToken}}

Body:
{
  "message": "What architecture would you recommend for this health monitoring system?"
}

Expected Response (200):
{
  "success": true,
  "data": {
    "conversationId": "...",
    "answer": "Based on your project requirements..."
  }
}

Tests:
  pm.test("Has answer", () => {
    pm.expect(pm.response.json().data.answer).to.be.a("string");
    pm.expect(pm.response.json().data.answer.length).to.be.greaterThan(0);
  });
```

---

## 5. Test Sequences (Runner Order)

### 5.1 Full Happy Path

Run these requests in order for a complete test flow:

| # | Request | Purpose |
|---|---|---|
| 1 | Register | Create test account |
| 2 | Login | Get fresh tokens |
| 3 | Get Me | Verify identity |
| 4 | Create Project | Create test project |
| 5 | List Projects | Verify project appears |
| 6 | Get Project | Verify details |
| 7 | Update Project | Modify fields |
| 8 | Get Stats | Check counts |
| 9 | Start Research | Queue research job |
| 10 | Get Job | Check job status |
| 11 | Copilot Chat | Ask a question |
| 12 | Copilot History | Check conversation |
| 13 | Delete Project | Clean up |
| 14 | Logout | Revoke tokens |

### 5.2 Error Path Testing

| # | Request | Expected |
|---|---|---|
| 1 | Register (duplicate email) | 409 |
| 2 | Login (wrong password) | 401 |
| 3 | Get Project (no auth) | 401 |
| 4 | Get Project (non-member) | 403 |
| 5 | Delete Project (as viewer) | 403 |
| 6 | Start Research (already running) | 409 |
| 7 | Add Member (owner role) | 400 |
| 8 | Refresh (invalid token) | 401 |

---

## 6. Pre-Request Script (Collection Level)

```javascript
// Auto-refresh expired access token
const tokenExpiry = pm.environment.get("tokenExpiry");
if (tokenExpiry && Date.now() > parseInt(tokenExpiry)) {
  const refreshToken = pm.environment.get("refreshToken");
  if (refreshToken) {
    pm.sendRequest({
      url: pm.environment.get("apiBase") + "/auth/refresh",
      method: "POST",
      header: { "Content-Type": "application/json" },
      body: { mode: "raw", raw: JSON.stringify({ refreshToken }) }
    }, (err, res) => {
      if (!err && res.code === 200) {
        const data = res.json().data;
        pm.environment.set("accessToken", data.accessToken);
        pm.environment.set("refreshToken", data.refreshToken);
      }
    });
  }
}
```

---

## 7. Future Improvements

1. **Postman JSON Export**: Generate importable `NEXUS.postman_collection.json`
2. **Newman CI Integration**: Run collection in CI pipeline via Newman
3. **Environment Profiles**: Separate dev, staging, production environments
4. **Data-Driven Tests**: CSV/JSON data files for parameterized testing
5. **WebSocket Testing**: Socket.io event testing (requires Postman WebSocket support or custom tool)
6. **Performance Benchmarks**: Response time assertions (< 500ms for reads)
