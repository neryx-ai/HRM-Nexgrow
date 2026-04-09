# Testing Patterns

**Analysis Date:** 2026-04-09

## Test Framework

**Runner:**
- **None configured.** No test framework is installed or configured.
- No `vitest`, `jest`, `mocha`, `jasmine`, or any test runner in `package.json` dependencies or devDependencies.
- No test configuration files found (`vitest.config.*`, `jest.config.*`, `pytest.ini`, etc.).

**Assertion Library:**
- None installed.

**Run Commands:**
```bash
# No test commands defined in package.json
# package.json scripts:
#   "dev": "next dev"
#   "build": "next build"
#   "start": "next start"
#   "lint": "eslint"
```

## Test File Organization

**Location:**
- **No test files exist.** Searched for `**/*.test.*` and `**/*.spec.*` patterns — zero results.
- No `__tests__/` directories.
- No `test/` or `tests/` directories.

**Naming:**
- Not applicable — no test files present.

**Structure:**
- Not applicable.

## Test Coverage

**Requirements:** None enforced — no coverage tooling configured.

**Coverage Tool:** None installed.

## What Should Be Tested

Based on the current codebase, these areas would benefit from testing when a framework is adopted:

### High Priority — Server Actions (`src/actions/auth.actions.ts`)
```typescript
// Functions that should have unit/integration tests:
- signup(formData: unknown): Promise<ActionResponse>
- login(formData: unknown): Promise<ActionResponse>
- logout(): Promise<ActionResponse>
- getSession()
- getUserProfile(): Promise<ActionResponse>
- updateProfile(formData: unknown): Promise<ActionResponse>
- updatePassword(formData: unknown): Promise<ActionResponse>
```
All follow a consistent pattern that can be tested:
1. Session validation (returns `{ success: false, message: "No autorizado" }` if no session)
2. Input validation via Valibot `v.safeParse()`
3. Database/better-auth operation
4. Return `ActionResponse`

### High Priority — Validation Schemas (`src/lib/validations/auth.ts`)
```typescript
// Pure functions — ideal for unit testing:
- LoginSchema
- RegisterSchema
- UpdateProfileSchema
- UpdatePasswordSchema
```

### Medium Priority — Authorization/Permissions (`src/lib/permissions.ts`)
```typescript
// Role definitions and access control:
- ac (access control instance)
- adminRole permissions
- rrhhRole permissions
- empleadoRole permissions
```

### Medium Priority — Middleware (`src/proxy.ts`)
```typescript
// Route protection logic:
- proxy(request: NextRequest) — tests for public paths, auth redirects, role-based redirects
- isPublicPath(pathname: string)
```

### Lower Priority — UI Components
- Form components: `login-form.tsx`, `register-form.tsx`, `profile-form.tsx`
- Navigation: `sidebar.tsx`, `navbar.tsx`

## Recommended Testing Setup

When adding tests, follow these conventions based on the existing stack:

### Recommended Framework: Vitest

Vitest is the natural choice for this stack because:
- Native ESM support (matches `tsconfig.json` module settings)
- Native TypeScript support without extra config
- Fast, compatible with Vite/Next.js ecosystems
- Drop-in Jest-compatible API

**Installation:**
```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react
```

**Recommended Config (`vitest.config.ts`):**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Add script to `package.json`:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Test File Organization (Recommended)

Co-locate test files next to source files:

```
src/
├── actions/
│   ├── auth.actions.ts
│   └── auth.actions.test.ts      ← Unit tests for server actions
├── lib/
│   ├── validations/
│   │   ├── auth.ts
│   │   └── auth.test.ts          ← Unit tests for validation schemas
│   ├── permissions.ts
│   └── permissions.test.ts       ← Unit tests for RBAC definitions
├── proxy.ts
└── proxy.test.ts                  ← Unit tests for middleware
```

### Test Structure (Recommended)

**Validation Schema Tests:**
```typescript
import { describe, it, expect } from 'vitest';
import * as v from 'valibot';
import { LoginSchema, RegisterSchema } from './auth';

describe('LoginSchema', () => {
  it('should validate a valid login', () => {
    const result = v.safeParse(LoginSchema, {
      email: 'user@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = v.safeParse(LoginSchema, {
      email: 'not-an-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject short password', () => {
    const result = v.safeParse(LoginSchema, {
      email: 'user@example.com',
      password: '1234567',
    });
    expect(result.success).toBe(false);
  });
});
```

**Server Action Tests:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, logout, getUserProfile } from './auth.actions';

// Mock better-auth
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      signInEmail: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
  },
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

describe('login', () => {
  it('should return success on valid credentials', async () => {
    // ... test implementation
  });

  it('should return failure on error', async () => {
    // ... test implementation
  });
});
```

**Permission Tests:**
```typescript
import { describe, it, expect } from 'vitest';
import { adminRole, rrhhRole, empleadoRole } from './permissions';

describe('empleadoRole', () => {
  it('should have view-own empleado permission', () => {
    const result = empleadoRole.authorize({ empleado: ['view-own'] });
    // ... assertion
  });

  it('should NOT have create empleado permission', () => {
    // ... assertion
  });
});
```

### Mocking Guidelines

**What to Mock:**
- `@/lib/auth` — better-auth instance (all server action tests)
- `@/db/drizzle` — database connection (server action tests)
- `next/headers` — Next.js headers (server action tests)
- `next/navigation` — router/redirect functions
- `better-auth/react` — client auth hooks (component tests)

**What NOT to Mock:**
- Valibot schemas — test them directly as pure functions
- Permission definitions in `@/lib/permissions.ts` — test the actual role/permission objects
- `cn()` utility — it's a simple pure function

### Recommended Test Setup File

**`src/test/setup.ts`:**
```typescript
import '@testing-library/jest-dom/vitest';
```

### Common Patterns for This Codebase

**Testing ActionResponse Pattern:**
All server actions return the same shape. Test helper:
```typescript
function expectActionSuccess(result: ActionResponse, message?: string) {
  expect(result.success).toBe(true);
  if (message) expect(result.message).toBe(message);
}

function expectActionFailure(result: ActionResponse, message?: string) {
  expect(result.success).toBe(false);
  if (message) expect(result.message).toBe(message);
}
```

**Testing Valibot Validation Errors:**
```typescript
function getValidationErrors(schema: v.GenericSchema, data: unknown) {
  const result = v.safeParse(schema, data);
  if (result.success) return [];
  return result.issues.map((issue) => issue.message);
}
```

## Test Types

**Unit Tests:**
- Validation schemas in `src/lib/validations/`
- Permission/role definitions in `src/lib/permissions.ts`
- Utility functions in `src/lib/utils.ts`
- Role types in `src/types/roles.ts`

**Integration Tests:**
- Server actions in `src/actions/` (mocking auth + DB layers)
- API routes in `src/app/api/auth/`
- Middleware in `src/proxy.ts`

**E2E Tests:**
- Not configured. Consider Playwright or Cypress for future E2E coverage.
- Critical E2E flows: login → dashboard access, role-based route protection, profile update

## Current State Summary

| Area | Files | Tests | Coverage |
|------|-------|-------|----------|
| Server Actions | 2 | 0 | 0% |
| Validations | 1 | 0 | 0% |
| Permissions | 1 | 0 | 0% |
| Components | 12+ | 0 | 0% |
| Pages/Routes | 8+ | 0 | 0% |
| Middleware | 1 | 0 | 0% |
| **Total** | **25+** | **0** | **0%** |

**The codebase has zero test coverage.** No test framework, no test files, no test scripts. This is a greenfield testing setup opportunity.

---

*Testing analysis: 2026-04-09*
