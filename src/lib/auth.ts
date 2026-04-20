import { db } from "@/db/drizzle";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { user, session, account, verification } from "@/db";
import { ac, adminRole, rrhhRole, empleadoRole } from "@/lib/permissions";
import { emailService } from "@/lib/email";
import { logger } from "@/lib/logger";

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
    sendResetPassword: async ({ user, url }) => {
      const html = emailService.buildResetPasswordEmailHtml({
        name: user.name,
        resetUrl: url,
      });

      const sent = await emailService.sendEmail({
        to: user.email,
        subject: "Recuperar contraseña — Jivis RRHH",
        html,
      });

      if (!sent) {
        logger.warn("AUTH", `Enlace de recuperación generado para ${user.email}: ${url}`);
      }
    },
  },
  plugins: [
    admin({
      ac,
      roles: {
        admin: adminRole,
        rrhh: rrhhRole,
        empleado: empleadoRole,
      },
      defaultRole: "empleado",
      adminRoles: ["admin", "rrhh"],
    }),
    nextCookies(),
  ],
});
