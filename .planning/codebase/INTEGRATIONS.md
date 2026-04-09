# External Integrations

**Analysis Date:** 2026-04-09

## APIs & External Services

**None currently integrated.** The application is self-contained. The following are planned per README:
- SMTP email service - Planned for password recovery and employee invitations (not yet implemented)
- Cloudflare R2 / S3 Storage - Planned for employee document storage (mentioned in README but not in codebase)

## Data Storage

**Databases:**
- PostgreSQL - Primary and only data store
  - Connection: `DATABASE_URL` env var
  - Client: `pg` Pool → Drizzle ORM (`src/db/drizzle.ts`)
  - ORM: Drizzle ORM 0.45.1 with PostgreSQL dialect
  - Schema: `src/db/schema/auth.schema.ts` (auth tables only, currently)
  - Migrations: `migrations/` directory (managed by `drizzle-kit`)
  - Neon serverless driver also installed (`@neondatabase/serverless`) but not actively used in DB connection setup

**Database Schema (Active - Drizzle):**
- `user` - Auth users (id, name, email, role, banned status)
- `session` - Active sessions (token-based, with IP/UA tracking)
- `account` - OAuth/credential accounts (providerId, tokens, password hash)
- `verification` - Email verification tokens

**Database Schema (Planned - DBML):**
- Defined in `DATABASE_V2.dbml` (v2, not yet implemented as Drizzle schemas)
- Planned tables: `sucursal`, `puesto`, `empleado`, `documento_empleado`, `dispositivo_quiosco`, `registro_asistencia`, `resumen_asistencia_diaria`, `saldo_vacaciones`, `solicitud_vacacion`, `feriado`, `tramo_renta`, `planilla`, `detalle_planilla`, `auditoria`
- Legacy SQL schema in `TFG-Jivis-App.sql` (superseded by DBML v2)

**File Storage:**
- None currently. README mentions planned Cloudflare R2 integration for employee documents
- Static assets served from `public/` and `src/app/assets/`

**Caching:**
- None detected (no Redis, no memoization beyond Next.js built-in)

## Authentication & Identity

**Auth Provider:**
- better-auth 1.4.20 - Self-hosted authentication framework
  - Server config: `src/lib/auth.ts`
    - Uses Drizzle adapter with PostgreSQL provider
    - Email + password authentication enabled
    - Plugins: `admin` (RBAC), `nextCookies` (cookie-based sessions)
  - Client config: `src/lib/auth-client.ts`
    - Uses `adminClient` plugin for client-side permission checks
  - API route handler: `src/app/api/auth/[...all]/route.ts` (catch-all for better-auth endpoints)
  - Route guard: `src/proxy.ts` - Middleware-style session checker and role-based redirector

**Access Control (RBAC):**
- Defined in `src/lib/permissions.ts` using `createAccessControl` from better-auth
- Three roles: `admin`, `rrhh`, `empleado`
- Role type definitions in `src/types/roles.ts`
- Resources with granular permissions:
  - `sucursal`, `puesto`, `empleado`, `asistencia`, `vacacion`, `planilla`, `reporte`, `quiosco`, `configuracion`, `perfil`
- Default role for new users: `empleado`
- Admin roles (can use Better-Auth admin panel): `admin`, `rrhh`

**Session Management:**
- Cookie-based sessions via `nextCookies` plugin
- Sessions stored in PostgreSQL `session` table
- Session validation in `src/proxy.ts` for dashboard routes

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, LogRocket, or similar)

**Logs:**
- `console.error` / `console.log` in server actions (`src/actions/auth.actions.ts`)
- No structured logging framework

## CI/CD & Deployment

**Hosting:**
- Vercel - Production deployment at `tfg-jivis-app.vercel.app`
- Auto-deploys from `main` branch

**CI Pipeline:**
- None detected (no `.github/workflows/`, no `vercel.json`)

**Branch Strategy:**
- `dev` branch for active development
- Pull Requests from `dev` → `main` for releases
- `main` branch deploys to production

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string (e.g., `postgresql://user:pass@localhost:5432/jivis`)
- `BETTER_AUTH_SECRET` - Secret key for auth token signing
- `BETTER_AUTH_URL` - Base URL for auth callbacks (e.g., `http://localhost:3000`)

**Secrets location:**
- `.env` file at project root (gitignored)

## Webhooks & Callbacks

**Incoming:**
- `POST /api/auth/[...all]` - Better-auth catch-all endpoint (sign-in, sign-up, session management)
- `GET /api/auth/[...all]` - Better-auth session/token endpoints

**Outgoing:**
- None currently

## Planned Integrations (Not Yet Implemented)

**Email (SMTP):**
- Purpose: Password recovery emails, employee invitation emails with temporary passwords
- Status: Mentioned in README as TODO
- No SMTP configuration detected in codebase

**File Storage (Cloudflare R2 / S3):**
- Purpose: Employee documents (contracts, IDs, etc.)
- Referenced in `DATABASE_V2.dbml`: `documento_empleado.url` field for "URL en Supabase Storage / S3"
- Status: Mentioned in README as planned, not yet integrated

**Kiosk System:**
- Purpose: Physical attendance tracking devices at branches
- Referenced in `DATABASE_V2.dbml`: `dispositivo_quiosco` table with token-based auth
- Referenced in `src/lib/permissions.ts`: `asistencia: ["marcar-quiosco"]` permission
- Status: Database schema planned, not yet implemented

---

*Integration audit: 2026-04-09*
