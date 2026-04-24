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
BETTER_AUTH_SECRET=SMt**********************Neu
BETTER_AUTH_URL=http://localhost:3000
```

## Probar app en vivo (RECOMENDADO)

La app ya esta en linea implementada en Vercel, puede visitarla en "[tfg-jivis-app.vercel.app](https://tfg-jivis-app.vercel.app/)", donde conforme se publiquen cambios en la rama main se actualiza la aplicación para los usuarios finales.

Para el desarrollo se utiliza una rama "dev" para separar los commits temporales que sean de desarrollo sin terminar funcionalidades completas, al terminar una funcionalidad se crean Pull Requests y los cambios de la rama "dev" se aplican a la rama "main".

Cuentas demo para probar la aplicación:

- Usuario: marcoferab2001@gmail.com
- Contraseña: F8$!vViN4oDx

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
- Se completo el sistema de inicio de sesión.
- En el sidebar de la aplicación ahora se filtran los enlaces según el rol del usuario. Permitiendo acceso solo a las funcionalidades correspondientes.
- Se agrego un Avatar del usuario en el navbar con un menu desplegable para cerrar sesión y acceder a su perfil.
- Se implemento un formulario para actualizar los datos personales del usuario en la pagina de perfil.

TO-DO: 
- Auth: Falta en el modulo de empleados, enviar invitación por correo electronico a los nuevos empleados, el sistema genera una contraseña termporal que le llega al correo al empleado y el empleado debe ir a su perfil a actualizar su contraseña.
- Auth: Recuperación de contraseña: Proximamente implementaré el SMTP para envio de correos, necesario para enviar el correo de recuperación de contraseñas a los empleados.
- S3/R2 Storage: Tendré una sesión con la empresa para discutir donde almacenar los archivos relacionados con empleados y demás, de momento para pruebas estoy utilizando Cloudflare R2, aunque aun no lo agrego al Gitlab ni a la web publica.

### Base de datos v2

Se creo un nuevo modelo de base de datos para el sistema de RRHH, el cual se encuentra en el archivo `DATABASE_V2.dbml` y se puede visualizar en el siguiente enlace: [DATABASE_V2.dbml](https://dbdiagram.io/d/TFG-Jivis-App-6996a7dfbd82f5fce2248f7e)

Se implemento el diseño en .dbml para poder visualizar el modelo de base de datos de manera mas clara y organizada.

Se puede observar que las tablas para autenticación estan en su version final, mientras que el resto de tablas estan en version 2 y aun no son definitivas.


## Avance 3

- Se implemento el sistema de recuperación de contraseña con envio de correo electronico.
- Se implemento el sistema de cambio obligatorio de contraseña al primer inicio de sesión.
- Se implemento el sistema de creación de usuarios con envio de correo electronico con contraseña temporal.
- Se crearon los placeholders de .env en .env.example
- Se creo un logger para registrar los eventos de la aplicación en `src/lib/logger.ts`
- Se creo la integración con nodemailer para envio de correos electronicos, con alternativa de mostrar en los logs si no se configura el SMTP.
- Se creo el campo "must_change_password" en el modelo de usuario para indicar si el usuario debe cambiar su contraseña al primer inicio de sesión.
- Se creo el action de creación de usuario y envio de correo electronico con contraseña temporal.
- Change password terminado
- Redireccion automatica a change password si "must_change_password" es true
- Formulario de recuperación de contraseña implementado

**Deuda técnica corregida**
- Se corrigieron varios detalles de la implementación anterior (dependencias que ya no se usan, codigo comentado, etc.)

### Notas del avance 3

Se pueden apreciar los modulos de **Empleados**, **Sucursales** y **Puestos** con sus respectivas funcionalidades basicas.

No se ha conectado el servidor SMTP para el envio de correos electronicos en la app en produccion, unicamente se han hecho pruebas en local, por lo que los correos de momento se mostrarán en los logs de la aplicacion.

### Avances 22 y 23 de abril

Se añadio el modulo de **Asistencia** con sus respectivas funcionalidades basicas.
Se creo la pagina de Quiosco donde los empleados ingresan el pin al entrar y al salir y la entrada y salida es registrada automaticamente.

Se agrego el modulo de **Vacaciones**.
Se agrego el modulo de **Planilla**.
Ambos modulos tienen las funcionalidades basicas, pero falta realizar pruebas de uso.
Planilla aun no envia las colillas de pago a los empleados, pendiente para probar e implementar proximamente, probablemente conectare "resend" para pruebas, asi evitar exponer los datos de correo de la empresa mientras hay cuentas demo que se pueden filtrar...

Se corrigio la pagina de empleados para el usuario cuyo rol es de empleado para que solo pueda ver su perfil.
El empleado ya puede solicitar dias libres desde la aplicación.
El admin (Gerente/RRHH) puede aprobar o rechazar las solicitudes de dias libres.

Último commit para el avance 3: [Ver commit](https://gitlab.com/marcoa16b-uned/tfg-jivis-app/-/commit/767f53a2e2b2f816e11ada4e1e326813d040fa84)

Falta realizar pruebas de los modulos, el dashboard de gerencia, RRHH y Empleados. 
Falta conectar el servidor SMTP para envios de correos.
Se debe arreglar el modulo de asistencia para los empleados para que solo puedan ver sus propios registros.

Para pruebas como empleado usar:
usr: marcoferab2001@gmail.com
psw: F8$!vViN4oDx

Para pruebas como admin (Gerente/RRHH) usar:
usr: demo.admin@jivis.com
psw: DemoA1234!
