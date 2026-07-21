"use client";

import { ModeToggle } from "../theme/mode-toggle";
import MySidebarTrigger from "./my-sidebar-trigger";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { authClient } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const PATH_LABELS: Record<string, string> = {
  "": "Dashboard",
  empleados: "Empleados",
  sucursales: "Sucursales",
  payroll: "Planilla",
  vacations: "Vacaciones",
  asistencia: "Asistencia",
  settings: "Configuración",
  profile: "Mi Perfil",
  puestos: "Puestos",
  reportes: "Reportes",
  "change-password": "Cambiar contraseña",
};

function getPathLabel(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  // Asume que el navbar vive bajo /dashboard; toma el segmento posterior.
  const segment = segments[1] ?? "";
  return PATH_LABELS[segment] ?? "";
}

function MyNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [isOpen, setIsOpen] = useState(false);
  const pathLabel = getPathLabel(pathname);

  const signOut = async () => {
    await authClient.signOut();
    setIsOpen(false);
    router.push("/login");
  };
  return (
    <div className="w-full relative flex items-center p-2 pr-4">
      <div className="flex items-center gap-2 w-full bg-sidebar p-2 border border-foreground/5 shadow-sm rounded">
        <div className="relative flex items-center gap-2 w-full">
          <MySidebarTrigger />
          {/* <div className="block w-0.5 min-h-8 bg-foreground/10" /> */}
          <p className="text-sm font-semibold">{pathLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="">
                <Avatar className="rounded-sm">
                  <AvatarImage src={session?.user?.image || undefined} />
                  <AvatarFallback className="rounded-sm">
                    {session?.user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-foreground/50">
                  My Account
                </DropdownMenuLabel>
                <DropdownMenuItem>
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setIsOpen(false)}
                  >
                    Mi perfil
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export default MyNavbar;
