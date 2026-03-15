import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react"; // make sure to import from better-auth/react
import { ac, adminRole, rrhhRole, empleadoRole } from "@/lib/permissions";

export const authClient = createAuthClient({
  plugins: [
    adminClient({
      ac,
      roles: {
        admin: adminRole,
        rrhh: rrhhRole,
        empleado: empleadoRole,
      },
    }),
  ],
});
