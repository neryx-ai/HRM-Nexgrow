import "dotenv/config";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema/auth.schema";
import { sucursal } from "@/db/schema/sucursal.schema";
import { puesto } from "@/db/schema/puesto.schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

async function seedAdmin() {
  logger.info("SEED", "Verificando admin...");

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
}

async function seedSucursales() {
  logger.info("SEED", "Verificando sucursales...");

  const existing = await db.select({ id: sucursal.id }).from(sucursal).limit(1);
  if (existing.length > 0) {
    logger.info("SEED", "Ya existen sucursales. Saltando...");
    return;
  }

  await db.insert(sucursal).values([
    { nombre: "Sucursal Central", direccion: "San José, Puriscal, Centro", telefono: "2246-0001" },
    { nombre: "Sucursal Santiago", direccion: "Santiago, Puriscal", telefono: "2246-0002" },
    { nombre: "Sucursal Mercedes", direccion: "Mercedes, Puriscal", telefono: "2246-0003" },
  ]);

  logger.info("SEED", "3 sucursales creadas");
}

async function seedPuestos() {
  logger.info("SEED", "Verificando puestos...");

  const existing = await db.select({ id: puesto.id }).from(puesto).limit(1);
  if (existing.length > 0) {
    logger.info("SEED", "Ya existen puestos. Saltando...");
    return;
  }

  await db.insert(puesto).values([
    { nombre: "Vendedor", descripcion: "Atención al cliente y ventas en sucursal", salarioBase: "350000.00" },
    { nombre: "Bodeguero", descripcion: "Gestión de inventario y bodega", salarioBase: "320000.00" },
    { nombre: "Cajero", descripcion: "Manejo de caja y cobros", salarioBase: "330000.00" },
    { nombre: "Supervisor", descripcion: "Supervisión de personal y operaciones de sucursal", salarioBase: "550000.00" },
    { nombre: "Gerente de Sucursal", descripcion: "Gestión integral de sucursal", salarioBase: "750000.00" },
  ]);

  logger.info("SEED", "5 puestos creados");
}

async function seed() {
  logger.info("SEED", "=== Iniciando seed ===");
  await seedAdmin();
  await seedSucursales();
  await seedPuestos();
  logger.info("SEED", "=== Seed completado exitosamente ===");
}

seed()
  .catch((err) => {
    logger.error("SEED", "Error:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
