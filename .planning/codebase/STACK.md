# Technology Stack

**Analysis Date:** 2026-04-09

## Languages

**Primary:**
- TypeScript 5.9.x - All application code (frontend, backend via Server Actions, API routes, DB schema)

**Secondary:**
- SQL - Database migrations (`migrations/0000_brief_silvermane.sql`)
- CSS (Tailwind) - Styling via `src/app/globals.css` with CSS custom properties
- DBML - Database diagram specification (`DATABASE_V2.dbml`)

## Runtime

**Environment:**
- Node.js v20+ (specified in README)
- Next.js 16.1.6 with App Router and React Server Components (RSC)

**Package Manager:**
- pnpm v10.33.0 (pinned via `packageManager` field in `package.json`)
- Lockfile: `pnpm-lock.yaml` (present)
- Workspace config: `pnpm-workspace.yaml` (ignores sharp and unrs-resolver)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework (App Router, RSC, Server Actions, API Routes)
- React 19.2.3 - UI library (with React DOM 19.2.3)

**UI:**
- Tailwind CSS 4.2.0 - Utility-first CSS (via `@tailwindcss/postcss`)
- shadcn/ui (new-york style) - Component library configured in `components.json`
  - Uses Radix UI v1.4.3 primitives (`radix-ui`)
  - Icon library: Lucide React (`lucide-react` v0.575.0)
  - Base color: Stone, CSS variables enabled
  - RSC support: enabled
- next-themes 0.4.6 - Dark/light mode toggle (`src/components/theme/theme-provider.tsx`)
- sonner 2.0.7 - Toast notifications (`src/components/ui/sonner.tsx`)
- tw-animate-css 1.4.0 - Animation utilities for Tailwind

**Authentication:**
- better-auth 1.4.20 - Authentication framework
  - Server: `src/lib/auth.ts` (with drizzle adapter, admin plugin, nextCookies plugin)
  - Client: `src/lib/auth-client.ts` (with adminClient plugin)
  - Email/password auth enabled
  - Role-based access control (admin, rrhh, empleado)

**Database:**
- Drizzle ORM 0.45.1 - TypeScript ORM for PostgreSQL
- drizzle-kit 0.31.9 - Schema migrations and introspection
- PostgreSQL - Primary database (via Neon serverless or standard `pg` driver)

**Forms & Validation:**
- react-hook-form 7.71.2 - Form state management
- @hookform/resolvers 5.2.2 - Form validation adapters
- Valibot 1.2.0 - Runtime validation (used in `src/lib/validations/auth.ts`)
- Zod 4.3.6 - Also installed (dual validation libraries)

**Styling Utilities:**
- class-variance-authority 0.7.1 - Component variant definitions
- clsx 2.1.1 - Conditional class names
- tailwind-merge 3.5.0 - Merge Tailwind classes without conflicts

**Build/Dev:**
- ESLint 9.39.3 - Linting (with eslint-config-next for core-web-vitals and TypeScript)
- PostCSS - CSS processing (via `@tailwindcss/postcss`)

## Key Dependencies

**Critical:**
- `better-auth` 1.4.20 - Handles all authentication, session management, and RBAC
- `drizzle-orm` 0.45.1 - All database queries and schema definitions
- `next` 16.1.6 - Serves the entire application (SSR, API routes, static)

**Database Drivers:**
- `pg` 8.20.0 - PostgreSQL client (used in `src/db/drizzle.ts` for connection pool)
- `@neondatabase/serverless` 1.0.2 - Neon serverless PostgreSQL driver (available but not used in current DB setup)

**Auth/Security:**
- `jose` 6.1.3 - JWT/JWS/JWE handling (available for token operations)
- `dotenv` 17.3.1 - Environment variable loading (used in `drizzle.config.ts` and `src/db/drizzle.ts`)

**Utility:**
- `lucide-react` 0.575.0 - Icon library (used throughout sidebar and navigation)

## Configuration

**Environment:**
- `.env` file present (contains secrets - DO NOT read)
- Required variables (from README):
  - `DATABASE_URL` - PostgreSQL connection string
  - `BETTER_AUTH_SECRET` - Secret for Better Auth
  - `BETTER_AUTH_URL` - Base URL for auth callbacks

**Build:**
- `next.config.ts` - Minimal (empty config object)
- `tsconfig.json` - Strict mode, ES2017 target, bundler module resolution
  - Path alias: `@/*` → `./src/*`
- `drizzle.config.ts` - PostgreSQL dialect, schema at `./src/db/index.ts`, migrations to `./migrations/`
- `postcss.config.mjs` - Uses `@tailwindcss/postcss` plugin
- `eslint.config.mjs` - Next.js core-web-vitals + TypeScript rules
- `components.json` - shadcn/ui configuration (new-york style, stone base color)

**Fonts:**
- Geist Sans and Geist Mono - loaded via `next/font/google` in `src/app/layout.tsx`
- CSS custom properties define font families in `globals.css`: Inter (sans), Source Serif 4 (serif), IBM Plex Mono (mono)

## Platform Requirements

**Development:**
- Node.js v20+
- pnpm v9+ (v10.33.0 recommended)
- PostgreSQL database (local or remote)
- Git v2+

**Production:**
- Vercel - Deployed at `tfg-jivis-app.vercel.app`
- Connected to main branch; uses `dev` branch for development, PRs to `main`
- PostgreSQL database required (Neon or self-hosted)

---

*Stack analysis: 2026-04-09*
