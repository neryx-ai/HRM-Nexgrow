# TFG JIVIS — Sistema de Recursos Humanos

Sistema integral de RRHH para **Distribuidora Jivis S.A.** Desarrollado con Next.js 16, Better Auth, Drizzle ORM, PostgreSQL, Tailwind CSS y shadcn/ui.

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, Server Actions) |
| Autenticación | Better Auth 1.4 |
| ORM | Drizzle ORM 0.45 |
| Base de datos | PostgreSQL |
| UI | Tailwind CSS v4 + shadcn/ui (Radix UI) |
| Validación | Valibot 1.2 |
| Gráficos | Recharts |
| Exportación | jspdf, jspdf-autotable, xlsx |
| Testing | Vitest |
| Paquete | pnpm 10 |

## Módulos implementados

1. **Autenticación** — Login, registro, recuperación de contraseña, cambio obligatorio de contraseña al primer inicio
2. **Estructura organizacional** — CRUD de sucursales, puestos y empleados con generación de PIN
3. **Asistencia** — Marcaje por quiosco (PIN), registro manual, historial con filtros, corte automático
4. **Vacaciones** — Solicitud, aprobación/rechazo, saldos por período, cancelación
5. **Planilla** — Cálculo de planilla mensual/quincenal, deducciones legales (CCSS, INS, Banco Popular), impuesto de renta progresivo, ingresos extras, colillas de pago por email
6. **Dashboard y Reportes** — Métricas para admin/RRHH y empleado, reportes de asistencia y costos, exportación Excel/PDF
7. **Configuración** — Gestión de deducciones, feriados, tramos de renta y usuarios del sistema

## Requisitos previos

- Node.js 20+
- pnpm 10+
- PostgreSQL 15+
- Git 2+

## Variables de entorno

Crear un archivo `.env` en la raíz del proyecto basado en `.env.example`:

```env
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/jivis"
BETTER_AUTH_SECRET="generado-con-openssl-rand-base64-32"
BETTER_AUTH_URL="http://localhost:3000"

SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="correo@example.com"
SMTP_PASS="contraseña-de-app"
SMTP_FROM="Jivis RRHH <correo@example.com>"
```

## Instalación y setup

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd tfg-jivis-app

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con las credenciales de PostgreSQL

# 4. Generar y ejecutar migraciones
pnpm db:generate
pnpm db:migrate

# 5. Sembrar datos iniciales
pnpm seed

# 6. Iniciar servidor de desarrollo
pnpm dev
```

## Scripts disponibles

| Script | Descripción |
|--------|------------|
| `pnpm dev` | Iniciar servidor de desarrollo |
| `pnpm build` | Compilar para producción |
| `pnpm start` | Iniciar servidor de producción |
| `pnpm lint` | Ejecutar ESLint |
| `pnpm test` | Ejecutar tests (Vitest) |
| `pnpm test:watch` | Ejecutar tests en modo watch |
| `pnpm seed` | Sembrar datos iniciales en la BD |
| `pnpm db:generate` | Generar migraciones Drizzle |
| `pnpm db:migrate` | Ejecutar migraciones pendientes |

## Estructura del proyecto

```
src/
├── actions/          # Server Actions (empleado, planilla, auth, etc.)
├── app/              # App Router pages (dashboard, login, quiosco)
├── components/
│   ├── modules/      # Componentes de cada módulo
│   ├── navigation/   # Sidebar, navbar
│   └── ui/           # Componentes base (shadcn/ui)
├── db/
│   ├── schema/       # Definiciones Drizzle ORM
│   ├── drizzle.ts    # Conexión a PostgreSQL
│   ├── index.ts      # Barrel export
│   └── seed.ts       # Datos iniciales
├── lib/
│   ├── auth.ts       # Configuración de Better Auth
│   ├── email.ts      # Servicio de correos SMTP
│   ├── planilla.ts   # Motor de cálculo de planilla
│   ├── auditoria.ts  # Helper de auditoría
│   ├── logger.ts     # Logger estructurado
│   └── validations/  # Schemas de Valibot
migrations/           # Migraciones SQL generadas
```

## Roles y permisos

| Rol | Acceso |
|-----|--------|
| **admin** | Control total: CRUD empleados, sucursales, puestos, planillas, configuración, reportes gerenciales, gestión de usuarios |
| **rrhh** | Gestión operativa: crear/editar empleados, asistencia, planillas, vacaciones |
| **empleado** | Autoservicio: ver perfil, historial de asistencia propio, solicitar vacaciones |

## Credenciales de demo

```
Admin:     admin@jivis.com / Admin123!@#
```

> **Nota:** El SMTP debe configurarse para el envío de correos. Sin SMTP, las contraseñas temporales y enlaces de recuperación se muestran en los logs de la aplicación.

## Despliegue

La aplicación está disponible en [tfg-jivis-app.vercel.app](https://tfg-jivis-app.vercel.app/). Los cambios en la rama `main` se despliegan automáticamente en Vercel. El desarrollo se realiza en ramas `fase-*` que se integran a `dev` y luego a `main` mediante Pull Requests.
