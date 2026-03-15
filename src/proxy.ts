import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// Rutas públicas que no requieren autenticación
const publicPaths = ["/login", "/register", "/password-recovery", "/api/auth"];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((path) => pathname.startsWith(path));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // console.log("Proxy request: ", pathname);

  // Permitir rutas públicas
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Verificar sesión solo en rutas del dashboard
  if (pathname.startsWith("/dashboard") || pathname === "/") {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    // Si no hay sesión y no es ruta pública, redirigir a login
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verificar rol para rutas específicas
    const userRole = (session.user as { role?: string })?.role || "empleado";

    // Rutas exclusivas de admin
    if (pathname.startsWith("/dashboard/admin") && userRole !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Rutas de RRHH
    if (
      pathname.startsWith("/dashboard/rrhh") &&
      !["admin", "rrhh"].includes(userRole)
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const proxyConfig = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets).*)"],
};
