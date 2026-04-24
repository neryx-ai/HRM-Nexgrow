import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema/auth.schema";
import { eq } from "drizzle-orm";

const publicPaths = ["/login", "/password-recovery", "/api/auth", "/quiosco"];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((path) => pathname.startsWith(path));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard") || pathname === "/") {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const userId = session.user.id;

    const [dbUser] = await db
      .select({ mustChangePassword: user.mustChangePassword, role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (dbUser?.mustChangePassword && pathname !== "/dashboard/change-password") {
      return NextResponse.redirect(
        new URL("/dashboard/change-password", request.url),
      );
    }

    const userRole = dbUser?.role || "empleado";

    if (pathname.startsWith("/dashboard/admin") && userRole !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

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
