import { db } from "@/db/drizzle";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { user, session, account, verification } from "@/db";
import { ac, adminRole, rrhhRole, empleadoRole } from "@/lib/permissions";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    admin({
      ac,
      roles: {
        admin: adminRole,
        rrhh: rrhhRole,
        empleado: empleadoRole,
      },
      defaultRole: "empleado", // Todo usuario nuevo es empleado por defecto
      adminRoles: ["admin", "rrhh"], // Ambos pueden usar el panel admin de Better-Auth
    }),
    nextCookies(),
  ],
});
