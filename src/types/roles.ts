export type Role = "admin" | "rrhh" | "empleado";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  rrhh: "Recursos Humanos",
  empleado: "Empleado",
};

export const ALLOW_ALL_ROLES: Role[] = ["admin", "rrhh", "empleado"];
export const ADMIN_ONLY: Role[] = ["admin"];
export const ADMIN_RRHH: Role[] = ["admin", "rrhh"];