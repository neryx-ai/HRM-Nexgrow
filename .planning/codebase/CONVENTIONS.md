# Coding Conventions

**Analysis Date:** 2026-04-09

## Naming Patterns

**Files:**
- Kebab-case for all files: `auth-client.ts`, `auth.actions.ts`, `my-sidebar-trigger.tsx`, `login-form.tsx`, `recovery-form.tsx`, `mode-toggle.tsx`, `theme-provider.tsx`
- Page files always named `page.tsx` (Next.js App Router convention)
- Layout files always named `layout.tsx` (Next.js App Router convention)
- Schema files: `{domain}.schema.ts` (e.g., `auth.schema.ts`)
- Server action files: `{domain}.actions.ts` (e.g., `auth.actions.ts`)
- Validation files: `{domain}.ts` inside `src/lib/validations/` (e.g., `auth.ts`)

**Functions & Components:**
- React components: PascalCase — `LoginForm`, `ProfileForm`, `MySidebar`, `MyNavbar`, `ModeToggle`, `ThemeProvider`, `UnderBuilding`
- Exported function components use named exports: `export function LoginForm(...)`, `export function ProfileForm(...)`
- Default exports used for page/layout components: `export default function LoginPage()`, `export default function RootLayout()`
- Sidebar/navigation components use `export default function MySidebar()` pattern
- Hooks: camelCase with `use` prefix — `useIsMobile()`, `useForm()`, `useSession()`
- Server actions: camelCase — `signup()`, `login()`, `logout()`, `getSession()`, `getUserProfile()`, `updateProfile()`, `updatePassword()`
- Utility functions: camelCase — `cn()`, `isPublicPath()`

**Variables:**
- camelCase: `geitSans`, `geistMono`, `loginUrl`, `actualPath`, `pathLabel`, `accessEmplaados`, `isProfileLoading`
- ALL_CAPS for constants: `MOBILE_BREAKPOINT`, `ALLOW_ALL_ROLES`, `ADMIN_ONLY`, `ADMIN_RRHH`
- Database table variables: lowercase singular — `user`, `session`, `account`, `verification`
- Relations: camelCase with `Relations` suffix — `userRelations`, `sessionRelations`, `accountRelations`

**Types:**
- Interfaces: PascalCase with `I` NOT used — `ActionResponse`, `ProfileFormProps`, `UserProfileResponse`
- Type aliases: PascalCase — `Role`, `LoginData`, `RegisterData`, `UpdateProfileData`, `UpdatePasswordData`
- Type inference from schemas: `v.InferOutput<typeof SchemaName>`

**Database Schema:**
- Table column names: camelCase in TypeScript, snake_case in PostgreSQL (mapped by Drizzle)
- Examples: `emailVerified` → `email_verified`, `createdAt` → `created_at`, `banReason` → `ban_reason`

## Code Style

**Formatting:**
- No Prettier config file detected — relies on ESLint for style enforcement
- Mix of semicolon usage: some files use semicolons (`src/actions/auth.actions.ts`), others omit them (`src/lib/utils.ts`, `src/hooks/use-mobile.ts`, `src/components/theme/theme-provider.tsx`)
- 2-space indentation throughout
- Quotes: double quotes for strings (enforced by ESLint config from `eslint-config-next`)
- Trailing commas: present in some files (inconsistent)

**Linting:**
- ESLint 9 with flat config: `eslint.config.mjs`
- Extends: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Run command: `pnpm lint`
- Global ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`

**TypeScript:**
- Strict mode enabled (`"strict": true`)
- Target: ES2017
- Module resolution: bundler
- JSX: react-jsx (automatic runtime)
- Path aliases: `@/*` → `./src/*`

## Import Organization

**Order:**
1. Side-effect imports: `import "dotenv/config";`
2. Third-party packages: `import { useForm, Controller } from "react-hook-form";`
3. Next.js imports: `import { headers } from "next/headers";`
4. Aliased internal imports (`@/`): `import { auth } from "@/lib/auth";`
5. Relative imports (within same route group): `import { LoginForm } from "./login-form";`

**No strict import ordering enforced** — order varies by file. Some files group React first, others group Next.js first. The general tendency is third-party → framework → internal.

**Path Aliases:**
- `@/*` → `./src/*` — used for all cross-directory imports
- Relative imports (`../`) used only for sibling/parent files within same component group:
  - `src/components/navigation/navbar.tsx`: `import { ModeToggle } from "../theme/mode-toggle"`
  - `src/app/(auth)/login/page.tsx`: `import { LoginForm } from "./login-form"`

## Client/Server Boundary

**"use client" directive** — used in:
- All form components: `login-form.tsx`, `register-form.tsx`, `profile-form.tsx`
- Components using React hooks: `sidebar.tsx`, `navbar.tsx`, `my-sidebar-trigger.tsx`, `mode-toggle.tsx`, `theme-provider.tsx`
- Hooks: `use-mobile.ts`

**"use server" directive** — used in:
- Server action files: `src/actions/auth.actions.ts`

**Server Components (no directive):**
- All `page.tsx` files that fetch data
- All `layout.tsx` files
- Database configuration files

## Error Handling

**Server Actions Pattern:**
All server actions return a standardized `ActionResponse`:
```typescript
// src/actions/types.ts
export interface ActionResponse {
  success: boolean;
  message: string;
  data: object | unknown;
}
```

Usage pattern in actions:
```typescript
// src/actions/auth.actions.ts
try {
  // ... operation
  return { success: true, message: "Operación exitosa.", data: {} };
} catch (error) {
  console.error("Error description:", error);
  return { success: false, message: "Error message.", data: {} };
}
```

**Validation Pattern:**
Valibot schemas used for input validation in server actions:
```typescript
const parsed = v.safeParse(UpdateProfileSchema, formData);
if (!parsed.success) {
  return { success: false, message: "Datos inválidos", data: { errors: parsed.issues } };
}
```

**Client-Side Error Display:**
Toast notifications via `sonner` library:
```typescript
toast("Título", {
  description: res.message,
  position: "top-right",
  style: { "--border-radius": "calc(var(--radius) + 4px)" } as React.CSSProperties,
});
```

**Authentication Errors:**
Session checks in server actions and middleware return early:
```typescript
if (!session?.user) {
  return { success: false, message: "No autorizado", data: {} };
}
```

## Logging

**Framework:** Raw `console` — no structured logging library

**Patterns:**
- `console.error(...)` used in server action catch blocks for error reporting
- `console.log(...)` used for development debugging (present in `sidebar.tsx`, `login-form.tsx`, `auth.actions.ts`)
- Debug logs commented out in production code (e.g., `src/proxy.ts` line 14)

## Comments

**When to Comment:**
- JSDoc-style block comments for public functions:
  ```typescript
  /**
   * Obtiene el perfil del usuario autenticado
   */
  export async function getUserProfile(): Promise<ActionResponse> {
  ```
- Section divider comments in permissions/roles:
  ```typescript
  // ── Rol: admin ──────────────────────────────────────────────
  ```
- Inline comments for business logic explanations:
  ```typescript
  defaultRole: "empleado", // Todo usuario nuevo es empleado por defecto
  ```
- Commented-out code blocks present in several files (unfinished features)

**JSDoc/TSDoc:**
- Used sparingly, mainly on server action functions
- Not used on React components or utility functions

## Validation

**Library:** Valibot (`valibot` v1.2.0)

**Pattern — Schema Definition:**
```typescript
// src/lib/validations/auth.ts
import * as v from "valibot";

export const LoginSchema = v.object({
  email: v.pipe(
    v.string("Error message."),
    v.nonEmpty("Error message."),
    v.email("Error message."),
  ),
  password: v.pipe(
    v.string("Error message."),
    v.nonEmpty("Error message."),
    v.minLength(8, "Error message."),
  ),
});

export type LoginData = v.InferOutput<typeof LoginSchema>;
```

**Pattern — Client-Side Form Integration:**
React Hook Form with Valibot resolver:
```typescript
const form = useForm<LoginData>({
  resolver: valibotResolver(LoginSchema),
  defaultValues: { email: "", password: "" },
});
```

**Pattern — Field Rendering with Controller:**
```typescript
<Controller
  name="email"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field>
      <FieldLabel htmlFor="email">Label</FieldLabel>
      <Input id="email" {...field} aria-invalid={fieldState.invalid} />
      {fieldState.error && (
        <p className="text-destructive text-sm">{fieldState.error.message}</p>
      )}
    </Field>
  )}
/>
```

**NOTE:** Zod v4 is also a dependency but Valibot is the actively used validation library.

## Function Design

**Size:** Functions range from 5 to 80+ lines. Server actions tend to be longer due to try/catch + validation + DB operations. Components are 30-200 lines.

**Parameters:**
- Server actions accept `unknown` typed `formData` parameter
- React components use typed props interfaces
- Form components spread rest props: `({ className, ...props }: React.ComponentProps<"div">)`

**Return Values:**
- Server actions: `Promise<ActionResponse>`
- React components: JSX
- Utility functions: direct values

## Module Design

**Exports:**
- Named exports preferred for reusable components: `export function LoginForm(...)`, `export function ModeToggle()`
- Default exports for Next.js pages/layouts: `export default function LoginPage()`
- Default exports for navigation components: `export default MySidebar`
- Barrel exports via index files: `src/db/index.ts` re-exports schema

**Barrel Files:**
- `src/db/index.ts` — re-exports all schema tables from `./schema/auth.schema`
- No other barrel files present

## RBAC / Authorization Convention

**Access Control Definition:**
Defined in `src/lib/permissions.ts` using `better-auth` access control:
```typescript
const statement = {
  ...defaultStatements,
  recurso: ["accion1", "accion2"],
} as const;

export const ac = createAccessControl(statement);
export const adminRole = ac.newRole({ ... });
```

**Client-Side Permission Checks:**
```typescript
const accessEmplaados = authClient.admin.checkRolePermission({
  permission: { empleado: ["view-own"] },
  role: (session?.user.role as "admin" | "empleado" | "rrhh" | undefined) ?? "empleado",
});
```

**Server-Side Role Constants:**
```typescript
// src/types/roles.ts
export type Role = "admin" | "rrhh" | "empleado";
export const ADMIN_ONLY: Role[] = ["admin"];
export const ADMIN_RRHH: Role[] = ["admin", "rrhh"];
```

## Styling

**CSS Framework:** Tailwind CSS v4 with CSS variables

**Component Styling:**
- Utility-first via Tailwind classes
- `cn()` utility from `src/lib/utils.ts` for conditional class merging:
  ```typescript
  import { cn } from "@/lib/utils";
  <div className={cn("flex flex-col gap-6", className)}>
  ```
- Shadcn/UI component library (new-york style, stone base color)
- CSS variables for theming in `src/app/globals.css`
- Dark mode via `.dark` class (toggle via next-themes)

## UI Language

**All user-facing text is in Spanish:**
- Toast messages: "Perfil actualizado", "Error al iniciar sesión"
- Form labels: "Correo electrónico", "Contraseña", "Nombre completo"
- Button text: "Iniciar sesión", "Guardar cambios", "Cerrar sesión"
- Error messages: "La contraseña debe tener 8 caracteres o más."
- Comments are also primarily in Spanish

---

*Convention analysis: 2026-04-09*
