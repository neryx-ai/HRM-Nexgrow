# Architecture

**Analysis Date:** 2026-04-09

## Pattern Overview

**Overall:** Next.js App Router with React Server Components (RSC) and Server Actions

**Key Characteristics:**
- App Router convention with route groups `(auth)` and nested layouts
- Server-first rendering: pages are async RSC components that fetch data directly
- Client-side mutations via Server Actions (`"use server"` functions in `src/actions/`)
- Client-side interactivity via `"use client"` form components using react-hook-form
- Authentication handled by Better Auth with Drizzle ORM adapter to PostgreSQL
- Role-based access control (RBAC) with three roles: `admin`, `rrhh`, `empleado`
- Route protection via a proxy function in `src/proxy.ts` (not yet wired as Next.js middleware)
- UI built with shadcn/ui (new-york style) + Radix UI primitives + Tailwind CSS v4
- Form validation with Valibot schemas + react-hook-form resolver

## Layers

**Presentation (Pages & Layouts):**
- Purpose: Route definitions, page composition, layout nesting
- Location: `src/app/`
- Contains: `page.tsx` (route pages), `layout.tsx` (shared layouts), route groups
- Depends on: Server Actions (`src/actions/`), feature components (`src/components/modules/`), navigation components
- Used by: Next.js App Router

**Feature Components (Client Forms):**
- Purpose: Interactive form UI with validation and mutation logic
- Location: `src/components/modules/`
- Contains: `"use client"` components with react-hook-form + Valibot resolver
- Depends on: Server Actions, UI primitives (`src/components/ui/`), validation schemas (`src/lib/validations/`)
- Used by: Pages

**Navigation Components:**
- Purpose: Sidebar, navbar, and layout chrome
- Location: `src/components/navigation/`
- Contains: `"use client"` components that read auth state for conditional rendering
- Depends on: `authClient` from `src/lib/auth-client.ts`, UI primitives
- Used by: Dashboard layout

**Server Actions:**
- Purpose: Server-side mutations and data fetching functions callable from client
- Location: `src/actions/`
- Contains: `"use server"` exported async functions
- Depends on: `auth` from `src/lib/auth.ts`, `db` from `src/db/drizzle.ts`, validation schemas
- Used by: Client components via direct function import (Next.js Server Actions)

**Auth Layer:**
- Purpose: Authentication and authorization configuration
- Location: `src/lib/auth.ts` (server), `src/lib/auth-client.ts` (client), `src/lib/permissions.ts` (RBAC)
- Contains: Better Auth server instance, client instance, access control definitions
- Depends on: `db` from `src/db/drizzle.ts`, schema from `src/db/`, Better Auth plugins
- Used by: Server Actions, API routes, navigation components

**Database Layer:**
- Purpose: ORM schema definitions and database connection
- Location: `src/db/`
- Contains: Drizzle ORM schema (`src/db/schema/auth.schema.ts`), connection (`src/db/drizzle.ts`), barrel export (`src/db/index.ts`)
- Depends on: `drizzle-orm`, `pg` (node-postgres)
- Used by: Auth layer, Server Actions

**Validation Layer:**
- Purpose: Input validation schemas for forms
- Location: `src/lib/validations/`
- Contains: Valibot schemas with Spanish error messages + inferred TypeScript types
- Depends on: `valibot`
- Used by: Server Actions (server-side validation), form components (via valibotResolver)

**UI Primitives:**
- Purpose: Reusable base UI components
- Location: `src/components/ui/`
- Contains: shadcn/ui generated components (Button, Card, Input, Sidebar, etc.)
- Depends on: `radix-ui`, `class-variance-authority`, `tailwind-merge`
- Used by: All other component layers

## Data Flow

**Authentication Flow (Login):**

1. User visits `/login` → `(auth)/login/page.tsx` renders `LoginForm` (RSC page, client form)
2. `LoginForm` validates input client-side with `valibotResolver(LoginSchema)` via react-hook-form
3. On submit, calls `login()` Server Action from `src/actions/auth.actions.ts`
4. Server Action calls `auth.api.signInEmail()` which queries PostgreSQL via Drizzle
5. Session cookie is set by Better Auth
6. Client receives `ActionResponse`, shows toast, redirects to `/dashboard`

**Route Protection Flow:**

1. Request hits Next.js → `src/proxy.ts` `proxy()` function checks path
2. Public paths (`/login`, `/register`, `/password-recovery`, `/api/auth`) pass through
3. Protected paths (`/dashboard`, `/`) call `auth.api.getSession()` to verify session
4. No session → redirect to `/login?redirect=pathname`
5. Role check for `/dashboard/admin` (admin only) and `/dashboard/rrhh` (admin + rrhh)
6. **Note:** This proxy function exists but is NOT yet wired as Next.js middleware (no `middleware.ts` file)

**Profile Update Flow:**

1. `/dashboard/profile/page.tsx` (RSC) calls `getUserProfile()` Server Action
2. Server Action reads session, returns user data
3. Page renders `ProfileForm` client component with user as prop
4. `ProfileForm` manages two forms: profile update and password change
5. Submit calls `updateProfile()` or `updatePassword()` Server Actions
6. Server Action validates with Valibot, calls `db.update()` or `auth.api.changePassword()`
7. `revalidatePath("/dashboard/profile")` triggers RSC re-render

**Sidebar Permission Flow:**

1. `MySidebar` (client component) calls `authClient.useSession()` to get session
2. For each menu item, calls `authClient.admin.checkRolePermission()` with specific permission
3. Menu items render conditionally based on permission check results

**State Management:**
- No global state management library (no Redux, Zustand, etc.)
- Server state: fetched directly in RSC pages via Server Actions / `auth.api.getSession()`
- Client state: `useState` for loading flags, `useForm` for form state
- Auth state: `authClient.useSession()` hook from Better Auth React client
- Theme state: `next-themes` ThemeProvider context

## Key Abstractions

**ActionResponse:**
- Purpose: Standardized return type for all Server Actions
- Examples: `src/actions/types.ts`
- Pattern: `{ success: boolean; message: string; data: object | unknown }`

**Auth Configuration (betterAuth):**
- Purpose: Central auth server instance with Drizzle adapter and RBAC plugin
- Examples: `src/lib/auth.ts` (server), `src/lib/auth-client.ts` (client)
- Pattern: Singleton instances exported for use across server/client code

**Access Control (ac):**
- Purpose: Define resources, actions, and role permissions declaratively
- Examples: `src/lib/permissions.ts`
- Pattern: `createAccessControl(statement)` → `ac.newRole({...})` for each role

**Validation Schemas:**
- Purpose: Single source of truth for input validation with type inference
- Examples: `src/lib/validations/auth.ts`
- Pattern: `v.object({...})` with `v.pipe()` chains → `v.InferOutput<>` for TypeScript types

## Entry Points

**Next.js App Router:**
- Location: `src/app/layout.tsx`
- Triggers: All HTTP requests
- Responsibilities: Root HTML shell, ThemeProvider, TooltipProvider, Toaster

**Auth API Route:**
- Location: `src/app/api/auth/[...all]/route.ts`
- Triggers: All `/api/auth/*` requests
- Responsibilities: Delegates to Better Auth handler via `toNextJsHandler(auth)`

**Root Page (Redirect):**
- Location: `src/app/page.tsx`
- Triggers: `/` requests
- Responsibilities: Checks session → redirect to `/dashboard` or `/login`

**Dashboard Layout:**
- Location: `src/app/dashboard/layout.tsx`
- Triggers: All `/dashboard/*` requests
- Responsibilities: Renders SidebarProvider + MySidebar + MyNavbar + children

**Auth Layout:**
- Location: `src/app/(auth)/layout.tsx`
- Triggers: `/login`, `/register`, `/password-recovery` requests
- Responsibilities: Renders theme toggle + page content (no sidebar/nav)

## Error Handling

**Strategy:** ActionResponse pattern with try/catch and user-friendly messages

**Patterns:**
- Server Actions wrap all logic in try/catch, return `{ success: false, message: "..." }` on error
- Errors logged with `console.error()` (Spanish-language messages)
- Client components show `toast()` notifications for success/failure
- No centralized error boundary or error page (`error.tsx`) detected
- No global API error interceptor

## Cross-Cutting Concerns

**Logging:** `console.error()` with Spanish-language messages in Server Actions; `console.log()` for debug in sidebar

**Validation:** Dual-layer: client-side via `valibotResolver` in react-hook-form, server-side via `v.safeParse()` in Server Actions

**Authentication:** Better Auth with Drizzle adapter; session-based with cookies; `nextCookies()` plugin

**Authorization:** RBAC via Better Auth admin plugin with three roles (admin, rrhh, empleado) and granular resource/action permissions

**Theming:** `next-themes` with light/dark/system modes; Tailwind CSS v4 with CSS variables

**Internationalization:** Spanish-language UI text hardcoded in components; validation messages in Spanish

---

*Architecture analysis: 2026-04-09*
