import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

// ── Recursos y acciones del negocio ──────────────────────────────────────────
const statement = {
  ...defaultStatements, // Mantiene: user, session (para Better-Auth)
  sucursal: ["create", "update", "delete", "list"],
  puesto: ["create", "update", "delete", "list"],
  empleado: ["create", "update", "delete", "list", "view-own"],
  asistencia: [
    "marcar-quiosco", // Solo el quiosco (token), no requiere sesión de usuario
    "marcar-manual", // Admin/RRHH registran entrada/salida manualmente
    "list", // Ver asistencia de todos
    "list-own", // Ver la propia asistencia
    "edit", // Corregir un registro existente
  ],
  vacacion: ["solicitar", "aprobar", "rechazar", "list", "list-own"],
  planilla: ["calcular", "ver", "exportar", "enviar-comprobante"],
  reporte: ["ver-gerencial"],
  quiosco: ["activar"], // Permiso para configurar/abrir la vista de quiosco
  configuracion: ["ver", "editar"],
  perfil: ["ver", "editar"],
} as const;

export const ac = createAccessControl(statement);

// ── Rol: admin ────────────────────────────────────────────────────────────────
// Control total. Puede hacer todo + operaciones de usuario de Better-Auth.
export const adminRole = ac.newRole({
  ...adminAc.statements,
  sucursal: ["create", "update", "delete", "list"],
  puesto: ["create", "update", "delete", "list"],
  empleado: ["create", "update", "delete", "list", "view-own"],
  asistencia: ["marcar-manual", "list", "list-own", "edit"],
  vacacion: ["solicitar", "aprobar", "rechazar", "list", "list-own"],
  planilla: ["calcular", "ver", "exportar", "enviar-comprobante"],
  reporte: ["ver-gerencial"],
  quiosco: ["activar"],
  configuracion: ["ver", "editar"],
  perfil: ["ver", "editar"],
});

// ── Rol: rrhh ─────────────────────────────────────────────────────────────────
// Gestión operativa. No puede eliminar sucursales ni puestos, no ve reportes gerenciales.
export const rrhhRole = ac.newRole({
  empleado: ["create", "update", "list", "view-own"],
  asistencia: ["marcar-manual", "list", "list-own", "edit"],
  planilla: ["calcular", "ver", "exportar", "enviar-comprobante"],
  quiosco: ["activar"],
  vacacion: ["solicitar", "aprobar", "rechazar", "list", "list-own"],
  perfil: ["ver", "editar"],
});

// ── Rol: empleado ─────────────────────────────────────────────────────────────
// Solo acceso a su propia información.
export const empleadoRole = ac.newRole({
  empleado: ["view-own"],
  asistencia: ["list-own"], // Ver su historial, pero NO marcar (eso es el quiosco)
  vacacion: ["solicitar", "list-own"],
  perfil: ["ver", "editar"],
});
