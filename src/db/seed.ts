import "dotenv/config";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema/auth.schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

async function seed() {
  logger.info("SEED", "Iniciando seed de admin...");

  const adminEmail = "admin@jivis.com";
  const adminPassword = "Admin123!@#";

  const [existingUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, adminEmail))
    .limit(1);

  if (existingUser) {
    logger.info("SEED", `El admin ${adminEmail} ya existe. Saltando...`);
    return;
  }

  const result = await auth.api.signUpEmail({
    body: {
      name: "Administrador",
      email: adminEmail,
      password: adminPassword,
    },
  });

  if (!result) {
    logger.error("SEED", "Error al crear admin");
    process.exit(1);
  }

  await db
    .update(user)
    .set({
      role: "admin",
      mustChangePassword: false,
      emailVerified: true,
    })
    .where(eq(user.email, adminEmail));

  logger.info("SEED", `Admin creado: ${adminEmail}`);
  logger.info("SEED", `Contraseña: ${adminPassword}`);
  logger.info("SEED", "Seed completado exitosamente");
}

seed()
  .catch((err) => {
    logger.error("SEED", "Error:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
