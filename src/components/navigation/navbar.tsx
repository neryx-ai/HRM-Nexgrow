"use client";

import { Separator } from "@/components/ui/separator";
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

function MyNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [isOpen, setIsOpen] = useState(false);

  const actualPath = pathname.split("/")[2];
  let pathLabel = "";
  switch (actualPath) {
    case "":
      pathLabel = "Dashboard";
      break;
    case "employees":
      pathLabel = "Empleados";
      break;
    case "branches":
      pathLabel = "Sucursales";
      break;
    case "payroll":
      pathLabel = "Planilla";
      break;
    case "vacations":
      pathLabel = "Vacaciones";
      break;
    case "check-in-out":
      pathLabel = "Asistencia";
      break;
    case "settings":
      pathLabel = "Configuración";
      break;
    case "profile":
      pathLabel = "Mi Perfil";
      break;
    default:
      pathLabel = "";
  }

  const signOut = async () => {
    await authClient.signOut();
    setIsOpen(false);
    router.push("/login");
  };
  return (
    <div className="w-full relative flex items-center p-2 pr-4">
      <div className="flex items-center gap-2 w-full bg-sidebar p-2 border border-foreground/5 shadow-sm rounded">
        <div className="flex items-center gap-2 w-full">
          <MySidebarTrigger />
          <Separator orientation="vertical" />
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
