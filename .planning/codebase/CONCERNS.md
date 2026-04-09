# Codebase Concerns

**Analysis Date:** 2026-04-09

## Tech Debt

### Stub/No-Op Signup Action
- Issue: `signup()` in `src/actions/auth.actions.ts` (lines 18–24) returns hardcoded `{ success: true }` without creating any user. The register form's `onSubmit` in `src/app/(auth)/register/register-form.tsx` also does not call `signup()` — it just shows a toast with the raw form data (including plaintext password) via `JSON.stringify(data)`.
- Files: `src/actions/auth.actions.ts`, `src/app/(auth)/register/register-form.tsx`
- Impact: Registration is completely non-functional. Any user who "registers" sees a success toast but no account is created. Plaintext passwords are rendered in the browser DOM inside the toast `<pre>` block.
- Fix approach: Wire `register-form.tsx` to call the `signup` server action. Implement `signup` to use `auth.api.signUpEmail()` from Better Auth. Remove the `JSON.stringify(data)` debug toast.

### Duplicate Auth Schema
- Issue: `auth-schema.ts` at the project root is a duplicate of `src/db/schema/auth.schema.ts` with one difference: root version has `role: text("role")` without `.default("empleado")`, while the `src/` version has `.default("empleado")`. The root file is not imported anywhere but could cause confusion.
- Files: `auth-schema.ts` (root), `src/db/schema/auth.schema.ts`
- Impact: If someone accidentally imports from the root file, users would be created without a default role, breaking authorization logic that defaults to `"empleado"`.
- Fix approach: Delete `auth-schema.ts` from the project root. Keep the canonical schema at `src/db/schema/auth.schema.ts`.

### Commented-Out Code Blocks
- Issue: Multiple files contain substantial commented-out blocks of functional code rather than clean implementations:
  - `src/actions/auth.actions.ts` lines 210–227: Password verification logic commented out
  - `src/app/(auth)/register/register-form.tsx` lines 32–43: Password match check commented out
  - `src/app/(auth)/register/register-form.tsx` lines 16: `signup` import commented out
  - `src/app/dashboard/page.tsx` lines 15–25: Quick-access links commented out
  - `src/app/layout.tsx` line 7: `AuthProvider` import commented out
  - `src/app/(auth)/login/login-form.tsx` lines 149–152: Terms of Service text
  - `src/app/(auth)/register/register-form.tsx` lines 182–185: Terms of Service text
  - `src/app/(auth)/password-recovery/recovery-form.tsx` lines 66–69: Terms of Service text
  - `src/proxy.ts` line 14: console.log commented out
- Files: Throughout `src/`
- Impact: Code noise makes it harder to understand what's active. Future developers may uncomment stale code that doesn't work with the current architecture.
- Fix approach: Remove all commented-out code. Use git history to recover if needed.

### Incomplete Password Recovery Flow
- Issue: `src/app/(auth)/password-recovery/recovery-form.tsx` is a pure static form with no `onSubmit` handler, no validation, no server action call. It renders a form that submits via default HTML behavior (page reload) and does nothing.
- Files: `src/app/(auth)/password-recovery/recovery-form.tsx`, `src/app/(auth)/password-recovery/page.tsx`
- Impact: Users who click "¿Olvidaste tu contraseña?" from the login page reach a dead end. The form does nothing on submit.
- Fix approach: Implement the recovery flow using `auth.api.forgetPassword()` or `auth.api.sendVerificationEmail()` from Better Auth, with proper validation via Valibot schema.

### Under-Building Catch-All Route
- Issue: `src/app/dashboard/[...slug]/page.tsx` catches ALL unmatched dashboard sub-routes and renders a generic "Under Building" component. This silently swallows 404s for any mistyped or removed URL instead of showing a proper "not found" response.
- Files: `src/app/dashboard/[...slug]/page.tsx`, `src/components/navigation/under-building.tsx`
- Impact: Broken links are hidden behind a generic message. Users and developers can't distinguish between "intentionally not built" and "broken link."
- Fix approach: Either remove the catch-all and let Next.js handle 404s, or add logic to distinguish between known-planned routes and truly unknown ones.

## Known Bugs

### Registration Form Button Label Mismatch
- Symptoms: The register form's submit button reads "Iniciar sesión" (Log in) instead of "Registrarse" (Register).
- Files: `src/app/(auth)/register/register-form.tsx` line 169
- Trigger: Navigate to `/register` and look at the submit button.
- Workaround: None (cosmetic but confusing for users).

### Password Confirmation Not Validated in Schema
- Symptoms: `RegisterSchema` in `src/lib/validations/auth.ts` does not include a `v.assert` or custom refinement to verify `password === passwordConfirmation`. The client-side check in `register-form.tsx` is commented out (lines 32–43).
- Files: `src/lib/validations/auth.ts`, `src/app/(auth)/register/register-form.tsx`
- Trigger: Submit the registration form with mismatched passwords — the form will pass validation and proceed.
- Workaround: Re-enable the client-side check and add a Valibot refinement to the schema.

### `updatePassword` Server Action Duplicate Confirmation Check
- Symptoms: The password confirmation match is checked twice — once in `profile-form.tsx` (line 80, client-side) and once in `auth.actions.ts` (line 201, server-side). While not a bug per se, the client-side check in `profile-form.tsx` uses a toast instead of form validation, bypassing react-hook-form's error display.
- Files: `src/components/modules/profile/profile-form.tsx` line 80, `src/actions/auth.actions.ts` line 201
- Trigger: Submit mismatched passwords in the profile password change form.

## Security Considerations

### No Next.js Middleware for Route Protection
- Risk: `src/proxy.ts` exports a `proxy()` function that implements route protection logic (session checking, role-based redirects), but it is **never wired into Next.js middleware**. There is no `middleware.ts` file at the project root or in `src/`. This means all dashboard routes are accessible without authentication at the framework level.
- Files: `src/proxy.ts` (unused), no `middleware.ts`
- Current mitigation: `src/app/page.tsx` redirects to `/login` if no session, but direct navigation to `/dashboard/*` bypasses this. The profile page (`src/app/dashboard/profile/page.tsx`) does its own session check via `getUserProfile()`, but other dashboard pages do not.
- Recommendations: Create a `middleware.ts` at the project root (or `src/middleware.ts`) that imports and uses `proxy()`. Alternatively, rewrite the middleware using Better Auth's recommended approach.

### Unsafe Type Casting in Server Actions
- Risk: `login()` in `src/actions/auth.actions.ts` lines 31–32 casts `formData` with `(formData as { email: string }).email` and `(formData as { password: string }).password` without any validation. Any caller could pass arbitrary data.
- Files: `src/actions/auth.actions.ts` lines 31–32
- Current mitigation: The client-side form validates with `LoginSchema` via Valibot, but server actions can be called directly.
- Recommendations: Use `v.safeParse(LoginSchema, formData)` before accessing fields, consistent with how `updateProfile` and `updatePassword` handle validation.

### Debug console.log Statements in Production Code
- Risk: Several `console.log` and `console.error` statements leak internal information:
  - `src/components/navigation/sidebar.tsx` line 31: Logs `session?.user.role` on every render
  - `src/app/(auth)/login/login-form.tsx` line 39: Logs the full server response (which includes user data) on every login
  - `src/actions/auth.actions.ts` line 239: Logs the password change response data
  - `src/actions/auth.actions.ts` lines 51, 109, 163, 249: `console.error` with raw error objects
- Files: `src/components/navigation/sidebar.tsx`, `src/app/(auth)/login/login-form.tsx`, `src/actions/auth.actions.ts`
- Current mitigation: None
- Recommendations: Remove all `console.log` statements. Replace `console.error` with a structured logging utility that sanitizes sensitive data. In production, errors should go to a monitoring service.

### Plaintext Password Rendered in DOM
- Risk: The register form's `onSubmit` renders the entire form data — including the plaintext password — inside a toast notification via `JSON.stringify(data)`. This appears in the browser DOM and is visible in screenshots/screen readers.
- Files: `src/app/(auth)/register/register-form.tsx` lines 49–51
- Current mitigation: None
- Recommendations: Remove the `JSON.stringify` debug output. Show a simple success message instead.

### `ActionResponse.data` Typed as `object | unknown`
- Risk: `src/actions/types.ts` defines `data: object | unknown`, which is effectively `unknown` and provides no type safety. Every consumer must manually cast (e.g., `result.data as UserProfileResponse` in `src/app/dashboard/profile/page.tsx` line 23).
- Files: `src/actions/types.ts`, `src/app/dashboard/profile/page.tsx`
- Current mitigation: Manual type casting at call sites.
- Recommendations: Use generics: `ActionResponse<T = unknown>` with `data: T`. This eliminates unsafe casting at every call site.

### Password Stored in `account` Table
- Risk: The `account` table schema (`src/db/schema/auth.schema.ts` line 56) includes a `password` text column. While Better Auth manages password hashing, this column's existence should be verified as properly hashed by the library and not storing plaintext.
- Files: `src/db/schema/auth.schema.ts` line 56
- Current mitigation: Better Auth handles hashing automatically for the email-password provider.
- Recommendations: Verify through testing that passwords are bcrypt/scrypt hashed before storage. Add a comment in the schema documenting this expectation.

## Performance Bottlenecks

### Repeated Permission Checks Without Memoization
- Problem: `src/components/navigation/sidebar.tsx` calls `authClient.admin.checkRolePermission()` six separate times (lines 34–81), each with the same role cast from `session?.user.role`. Each call re-evaluates permissions independently. Additionally, the session `useEffect` on line 30–32 logs the role on every render without any dependency optimization.
- Files: `src/components/navigation/sidebar.tsx`
- Cause: No memoization of the role value or permission results.
- Improvement path: Extract the role once, memoize permission checks with `useMemo`, or create a `usePermissions()` hook that returns all needed permissions in a single call.

### Session Fetch on Every Page Load
- Problem: Both `src/app/page.tsx` and the proposed middleware in `src/proxy.ts` fetch the session via `auth.api.getSession()`. If middleware is activated, every request will trigger a database query for session validation, and then `page.tsx` will do it again on the root route.
- Files: `src/app/page.tsx`, `src/proxy.ts`
- Cause: No session caching strategy.
- Improvement path: Better Auth's session caching or Next.js middleware cookie-based checks to avoid double DB hits.

### Database Pool Without Configuration
- Problem: `src/db/drizzle.ts` creates a `pg.Pool` with only `connectionString` and no pool size limits, timeouts, or error handling. The `@neondatabase/serverless` package is installed alongside `pg`, suggesting potential confusion about which driver is in use.
- Files: `src/db/drizzle.ts`
- Cause: Minimal configuration.
- Improvement path: Add `max`, `idleTimeoutMillis`, `connectionTimeoutMillis` to the Pool config. Decide between `pg` (standard) and `@neondatabase/serverless` (edge-compatible) and remove the unused one.

## Fragile Areas

### Role Type System
- Files: `src/types/roles.ts`, `src/components/navigation/sidebar.tsx`, `src/proxy.ts`
- Why fragile: The `Role` type is defined in `src/types/roles.ts` as `"admin" | "rrhh" | "empleado"`, but the sidebar (`sidebar.tsx` lines 39, 47, 55, etc.) manually casts `session?.user.role as "admin" | "empleado" | "rrhh" | undefined` on every permission check instead of using the `Role` type. The proxy (`proxy.ts` line 35) casts session.user to `{ role?: string }` without using the `Role` type at all. If a new role is added, it must be updated in `permissions.ts`, `roles.ts`, and every manual cast location.
- Safe modification: Always import and use the `Role` type from `src/types/roles.ts`. Create a helper function `getSessionRole(session): Role` that centralizes the casting logic.
- Test coverage: No tests exist.

### Sidebar Permission Logic
- Files: `src/components/navigation/sidebar.tsx`
- Why fragile: Six nearly identical `authClient.admin.checkRolePermission()` blocks with inline role casting. If the permission API changes or a new menu item is added, copy-paste errors are likely. The variable name `accessEmplaados` has a typo (should be `accessEmpleados`).
- Safe modification: Extract a `usePermission(permission)` hook or a `hasPermission(role, permission)` utility to DRY up the checks.
- Test coverage: No tests exist.

### Auth Layout Naming Collision
- Files: `src/app/(auth)/layout.tsx` line 4
- Why fragile: The function is named `DashboardLayout` but it's the layout for the `(auth)` route group (login, register, password-recovery). This is misleading — it should be named `AuthLayout`.
- Safe modification: Rename the function to `AuthLayout`.
- Test coverage: No tests exist.

## Scaling Limits

### Single Schema File for All Tables
- Current capacity: Only auth tables exist (`user`, `session`, `account`, `verification`)
- Limit: The DBML at `DATABASE_V2.dbml` defines additional tables (`sucursal`, `puesto`, `empleado`, etc.) that need to be added as Drizzle schemas. Putting all tables in a single `auth.schema.ts` or even a single `schema/` directory will become unwieldy as the business domain grows.
- Scaling path: Create separate schema files per module (`auth.schema.ts`, `organization.schema.ts`, `attendance.schema.ts`, etc.) and re-export from `src/db/index.ts`.

### No API Rate Limiting
- Current capacity: No rate limiting on any endpoint
- Limit: The auth endpoints at `/api/auth/[...all]` and all server actions are unprotected from brute-force attacks (login, password change, registration)
- Scaling path: Add rate limiting middleware (e.g., `@upstash/ratelimit` or Next.js middleware with IP-based throttling).

## Dependencies at Risk

### Dual Validation Libraries (Valibot + Zod)
- Risk: `package.json` lists both `valibot` (^1.2.0) and `zod` (^4.3.6) as dependencies. Only Valibot is used in the codebase (`src/lib/validations/auth.ts`). Zod appears unused.
- Impact: Increased bundle size, potential confusion about which library to use for new validations.
- Migration plan: Remove `zod` from `package.json` unless it's needed by a dependency. Standardize on Valibot.

### Dual Database Drivers (pg + @neondatabase/serverless)
- Risk: Both `pg` (^8.20.0) and `@neondatabase/serverless` (^1.0.2) are installed. Only `pg` is used in `src/db/drizzle.ts`. The `@neondatabase/serverless` driver is designed for edge/serverless environments.
- Impact: Unnecessary dependency. If deploying to Vercel Edge or Cloudflare Workers, `pg` won't work and the driver must be swapped.
- Migration plan: Decide on deployment target. If using standard Node.js server, remove `@neondatabase/serverless`. If deploying to edge, switch `src/db/drizzle.ts` to use the serverless driver.

### Unused `jose` Package
- Risk: `jose` (^6.1.3) is listed as a dependency but is not imported anywhere in the codebase. Better Auth handles JWT internally.
- Impact: Unnecessary bundle size increase.
- Migration plan: Remove `jose` from `package.json` unless planned for immediate use.

## Missing Critical Features

### No Authorization Enforcement on Dashboard Pages
- Problem: Aside from the (inactive) middleware in `src/proxy.ts`, there is no server-side role check when loading dashboard pages. Any authenticated user can access any dashboard route regardless of role.
- Blocks: The entire role-based access control system defined in `src/lib/permissions.ts` is effectively decorative — it only hides/shows sidebar links but doesn't prevent direct URL access.

### No Authenticated Session Guard for Dashboard Layout
- Problem: `src/app/dashboard/layout.tsx` renders the sidebar and navbar without checking if a session exists. If middleware isn't active, unauthenticated users see the dashboard shell.
- Blocks: Proper auth gating of the entire dashboard section.

### No Error Boundary
- Problem: No React error boundary exists anywhere in the component tree. Runtime errors in any component will crash the entire page.
- Blocks: Graceful error handling and user experience during failures.

### No Loading States for Server Components
- Problem: `src/app/dashboard/profile/page.tsx` fetches user data server-side but has no `loading.tsx` file. Users see a blank page while data loads.
- Blocks: Proper perceived performance and user experience.

## Test Coverage Gaps

### Complete Absence of Tests
- What's not tested: The entire application. There are zero test files (no `*.test.ts`, `*.spec.ts`, `__tests__/` directories, or test framework configuration in `package.json`).
- Files: All files in `src/`
- Risk: Any refactoring or new feature could introduce regressions undetected. Server actions with unsafe type casts, permission logic, and auth flows are particularly vulnerable.
- Priority: **High** — The auth flow (login, registration, password recovery, session management) and permission system should have tests before adding more features.

### No Test Framework Configured
- What's not tested: No test runner (Vitest, Jest) is configured. No assertion library. No test scripts in `package.json`.
- Files: `package.json`
- Risk: Cannot run any tests even if they were written.
- Priority: **High** — Install and configure Vitest (recommended for Next.js + Vite compatibility) before writing tests.

---

*Concerns audit: 2026-04-09*
