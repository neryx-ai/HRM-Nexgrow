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

## Probar app en vivo

La app ya esta en linea implementada en Vercel, puede visitarla en "[tfg-jivis-app.vercel.app](https://tfg-jivis-app.vercel.app/)", donde conforme se publiquen cambios en la rama main se actualiza la aplicación para los usuarios finales.

Para el desarrollo se utiliza una rama "dev" para separar los commits temporales que sean de desarrollo sin terminar funcionalidades completas, al terminar una funcionalidad se crean Pull Requests y los cambios de la rama "dev" se aplican a la rama "main".

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
