import "dotenv/config";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema/auth.schema";
import { sucursal } from "@/db/schema/sucursal.schema";
import { puesto } from "@/db/schema/puesto.schema";
import { feriado } from "@/db/schema/feriado.schema";
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

async function seedFeriados() {
  logger.info("SEED", "Verificando feriados...");

  const existing = await db.select({ id: feriado.id }).from(feriado).limit(1);
  if (existing.length > 0) {
    logger.info("SEED", "Ya existen feriados. Saltando...");
    return;
  }

  const feriadosCR2026 = [
    { fecha: "2026-01-01", nombre: "Año Nuevo", tipo: "nacional" },
    { fecha: "2026-03-19", nombre: "Día de San José", tipo: "nacional" },
    { fecha: "2026-04-02", nombre: "Jueves Santo", tipo: "religioso" },
    { fecha: "2026-04-03", nombre: "Viernes Santo", tipo: "religioso" },
    { fecha: "2026-04-11", nombre: "Día de Juan Santamaría", tipo: "nacional" },
    { fecha: "2026-05-01", nombre: "Día del Trabajador", tipo: "nacional" },
    { fecha: "2026-06-29", nombre: "San Pedro y San Pablo", tipo: "religioso" },
    { fecha: "2026-07-25", nombre: "Anexión de Guanacaste", tipo: "nacional" },
    { fecha: "2026-08-02", nombre: "Virgen de los Ángeles", tipo: "religioso" },
    { fecha: "2026-08-15", nombre: "Asunción de la Virgen", tipo: "religioso" },
    { fecha: "2026-09-15", nombre: "Independencia de Centroamérica", tipo: "nacional" },
    { fecha: "2026-10-12", nombre: "Día de las Culturas", tipo: "nacional" },
    { fecha: "2026-12-01", nombre: "Abolición del Ejército", tipo: "nacional" },
    { fecha: "2026-12-25", nombre: "Navidad", tipo: "nacional" },
  ];

  await db.insert(feriado).values(feriadosCR2026);

  logger.info("SEED", `${feriadosCR2026.length} feriados de Costa Rica 2026 creados`);
}

async function seed() {
  logger.info("SEED", "=== Iniciando seed ===");
  await seedAdmin();
  await seedSucursales();
  await seedPuestos();
  await seedFeriados();
  logger.info("SEED", "=== Seed completado exitosamente ===");
}

seed()
  .catch((err) => {
    logger.error("SEED", "Error:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
