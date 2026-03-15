# TFG JIVIS - Marco Aguero Barboza

Este es un proyecto de [Next.js](https://nextjs.org) que implementa un sistema de recursos humanos para Jivis.

## Requisitos

- Node.js v20+
- pnpm v9+
- Git v2+

## Instalación

```bash
pnpm install
```

## Desarrollo

```bash
pnpm run dev
```

Abre [http://localhost:3000](http://localhost:3000) con tu navegador para ver el resultado.

### Base de datos

Para la base de datos se utiliza PostgreSQL, se debe crear una base de datos local con el nombre "jivis" y luego ejecutar los siguientes comandos:

```bash
pnpm run db:generate
pnpm run db:migrate
```

> **Nota:** Se debe configurar las variables de entorno en el archivo `.env` con las credenciales de la base de datos. Ejemplo:

```env
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/jivis"
```

## Probar app en vivo

La app ya esta en linea implementada en Vercel, puede visitarla en "[tfg-jivis-app.vercel.app](https://tfg-jivis-app.vercel.app/)", donde conforme se publiquen cambios en la rama main se actualiza la aplicación para los usuarios finales.

Para el desarrollo se utiliza una rama "dev" para separar los commits temporales que sean de desarrollo sin terminar funcionalidades completas, al terminar una funcionalidad se crean Pull Requests y los cambios de la rama "dev" se aplican a la rama "main".

Cuentas demo para probar la aplicación:

- Usuario: demo.empleado@jivis.com
- Contraseña: DemoE1234

- Usuario: demo.admin@jivis.com
- Contraseña: DemoA1234!

- Usuario: demo.rh@jivis.com
- Contraseña: DemoRh1234

## Avance 1

Para el avance 1 se muestran los avances de la primer semana de desarrollo:

- Creación del proyecto con Next.js
- Planificación del desarrollo del proyecto y la arquitectura del mismo
- Configuración del proyecto con TailwindCSS y Shadcn UI para una interfaz moderna y responsive
- Implementación de un formulario de inicio de sesión con validación de campos
- Implementación de una página de recuperación de contraseña con validación de campos
- Creación de componentes base para la aplicación (Sidebar, navbar, theme toggle, etc.)

En la pagina principal se observa el diseño base del proyecto, con el sidebar, el navbar y los enlaces a las paginas de autenticación temporalmente.

- Login: [http://localhost:3000/login](http://localhost:3000/login)
- Recuperar contraseña: [http://localhost:3000/password-recovery](http://localhost:3000/password-recovery)

## Avance 2

Para el avance 2 se muestran los avances de desarrollo:

- Se realizo la conexión con la base de datos PostgreSQL
- Se crearon los modelos de Auth de la base de datos con Drizzle ORM en `src/db/schema/auth.schema.ts`
- Se configuraron los roles de los usuarios en `src/lib/permissions.ts`
- Se completo el sistema de login.
- En el sidebar de la aplicación ahora se filtran los enlaces según el rol del usuario. Permitiendo acceso solo a las funcionalidades correspondientes.
- Se agrego un Avatar del usuario en el navbar con un menu desplegable para cerrar sesión y acceder a su perfil.
- Se implemento un formulario para actualizar los datos personales del usuario en la pagina de perfil.

### Base de datos v2

Se creo un nuevo modelo de base de datos para el sistema de RRHH, el cual se encuentra en el archivo `DATABASE_V2.dbml` y se puede visualizar en el siguiente enlace: [DATABASE_V2.dbml](https://dbdiagram.io/d/TFG-Jivis-App-6996a7dfbd82f5fce2248f7e)

Se implemento el diseño en .dbml para poder visualizar el modelo de base de datos de manera mas clara y organizada.

Se puede observar que las tablas para autenticación estan en su version final, mientras que el resto de tablas estan en version 2 y aun no son definitivas.
