"use client";

import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BookUser,
  Briefcase,
  Building2,
  ChartArea,
  FileBarChart,
  LayoutDashboard,
  Settings,
  TreePalm,
  UserCheck,
  Wallet,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import LogoImage from "@/app/assets/logo-jivis.png";
import { Session } from "@/types/sessions";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

function MySidebar({ 
  session 
}: { 
  session: Session
}) {

  const { open } = useSidebar();

  React.useEffect(() => {
    void session?.user.role;
  }, [session]);

  const accessEmpleados = authClient.admin.checkRolePermission({
    permission: {
      empleado: ["view-own"],
    },
    role:
      (session?.user.role as "admin" | "empleado" | "rrhh" | undefined) ??
      "empleado",
  });
  const accessBranches = authClient.admin.checkRolePermission({
    permission: {
      sucursal: ["list"],
    },
    role:
      (session?.user.role as "admin" | "empleado" | "rrhh" | undefined) ??
      "empleado",
  });
  const accessPayrolls = authClient.admin.checkRolePermission({
    permission: {
      planilla: ["ver"],
    },
    role:
      (session?.user.role as "admin" | "empleado" | "rrhh" | undefined) ??
      "empleado",
  });
  const accessVacations = authClient.admin.checkRolePermission({
    permission: {
      vacacion: ["list-own"],
    },
    role:
      (session?.user.role as "admin" | "empleado" | "rrhh" | undefined) ??
      "empleado",
  });
  const accessAttendance = authClient.admin.checkRolePermission({
    permission: {
      asistencia: ["list-own"],
    },
    role:
      (session?.user.role as "admin" | "empleado" | "rrhh" | undefined) ??
      "empleado",
  });
  const accessMiAsistencia = authClient.admin.checkRolePermission({
    permission: {
      asistencia: ["marcar-self"],
    },
    role:
      (session?.user.role as "admin" | "empleado" | "rrhh" | undefined) ??
      "empleado",
  });
  const accessConfiguration = authClient.admin.checkRolePermission({
    permission: {
      configuracion: ["ver"],
    },
    role:
      (session?.user.role as "admin" | "empleado" | "rrhh" | undefined) ??
      "empleado",
  });
  const accessReportes = authClient.admin.checkRolePermission({
    permission: {
      reporte: ["ver-gerencial"],
    },
    role:
      (session?.user.role as "admin" | "empleado" | "rrhh" | undefined) ??
      "empleado",
  });

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-center py-3">
          <figure className="rounded-sm border border-foreground/16 overflow-hidden">
            <Image src={LogoImage} alt="Jivis Logo" width={40} height={40} />
          </figure>
        </div>
      </SidebarHeader>
      <SidebarSeparator className="ml-0" />
      <SidebarContent>
        <SidebarGroup className="space-y-2">
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenuItem>
            <TooltipShow open={open} content="Dashboard">
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    size={open ? "default" : "icon"}
                    className={`w-full ${open ? "justify-start" : "justify-center"} text-base cursor-pointer`}
                  >
                    <LayoutDashboard className="size-5" />
                    {open && <span>Dashboard</span>}
                  </Button>
                </Link>
            </TooltipShow>
          </SidebarMenuItem>

          {accessEmpleados && (
            <SidebarMenuItem>
              <TooltipShow open={open} content="Empleados">
                <Link href="/dashboard/empleados">
                  <Button
                    variant="ghost"
                    size={open ? "default" : "icon"}
                    className={`w-full ${open ? "justify-start" : "justify-center"} text-base cursor-pointer`}
                  >
                    <BookUser className="size-5" />
                    {open && <span>Empleados</span>}
                  </Button>
                </Link>
              </TooltipShow>
            </SidebarMenuItem>
          )}

          {accessBranches && (
            <SidebarMenuItem>
              <TooltipShow open={open} content="Sucursales">
                <Link href="/dashboard/sucursales">
                  <Button
                    variant="ghost"
                    size={open ? "default" : "icon"}
                    className={`w-full ${open ? "justify-start" : "justify-center"} text-base cursor-pointer`}
                  >
                    <Building2 className="size-5" />
                    {open && <span>Sucursales</span>}
                  </Button>
                </Link>
              </TooltipShow>
            </SidebarMenuItem>
          )}

          {accessBranches && (
            <SidebarMenuItem>
              <TooltipShow open={open} content="Puestos">
                <Link href="/dashboard/puestos">
                  <Button
                    variant="ghost"
                    size={open ? "default" : "icon"}
                    className={`w-full ${open ? "justify-start" : "justify-center"} text-base cursor-pointer`}
                  >
                    <Briefcase className="size-5" />
                    {open && <span>Puestos</span>}
                  </Button>
                </Link>
              </TooltipShow>
            </SidebarMenuItem>
          )}

          {accessPayrolls && (
            <SidebarMenuItem>
              <TooltipShow open={open} content="Nóminas">
                <Link href="/dashboard/payroll">
                  <Button
                    variant="ghost"
                    size={open ? "default" : "icon"}
                    className={`w-full ${open ? "justify-start" : "justify-center"} text-base cursor-pointer`}
                  >
                    <Wallet className="size-5" />
                    {open && <span>Planilla</span>}
                  </Button>
                </Link>
              </TooltipShow>
            </SidebarMenuItem>
          )}

          {accessVacations && (
            <SidebarMenuItem>
              <TooltipShow open={open} content="Vacaciones">
                <Link href="/dashboard/vacations">
                  <Button
                    variant="ghost"
                    size={open ? "default" : "icon"}
                    className={`w-full ${open ? "justify-start" : "justify-center"} text-base cursor-pointer`}
                  >
                    <TreePalm className="size-5" />
                    {open && <span>Vacaciones</span>}
                  </Button>
                </Link>
              </TooltipShow>
            </SidebarMenuItem>
          )}

          {accessMiAsistencia && (
            <SidebarMenuItem>
              <TooltipShow open={open} content="Mi asistencia">
                <Link href="/dashboard/mi-asistencia">
                  <Button
                    variant="ghost"
                    size={open ? "default" : "icon"}
                    className={`w-full ${open ? "justify-start" : "justify-center"} text-base cursor-pointer`}
                  >
                    <UserCheck className="size-5" />
                    {open && <span>Mi asistencia</span>}
                  </Button>
                </Link>
              </TooltipShow>
            </SidebarMenuItem>
          )}

          {accessAttendance && (
            <SidebarMenuItem>
              <TooltipShow open={open} content="Asistencia">
                <Link href="/dashboard/asistencia">
                  <Button
                    variant="ghost"
                    size={open ? "default" : "icon"}
                    className={`w-full ${open ? "justify-start" : "justify-center"} text-base cursor-pointer`}
                  >
                    <ChartArea className="size-5" />
                    {open && <span>Asistencia</span>}
                  </Button>
                </Link>
              </TooltipShow>
            </SidebarMenuItem>
          )}

          {accessReportes && (
            <SidebarMenuItem>
              <TooltipShow open={open} content="Reportes">
                <Link href="/dashboard/reportes">
                  <Button
                    variant="ghost"
                    size={open ? "default" : "icon"}
                    className={`w-full ${open ? "justify-start" : "justify-center"} text-base cursor-pointer`}
                  >
                    <FileBarChart className="size-5" />
                    {open && <span>Reportes</span>}
                  </Button>
                </Link>
              </TooltipShow>
            </SidebarMenuItem>
          )}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {accessConfiguration && (
          <TooltipShow open={open} content="Configuración">
            <Link href="/dashboard/settings">
              <Button
                variant="ghost"
                size={open ? "default" : "icon"}
                className={`w-full ${open ? "justify-start" : "justify-center"} text-base cursor-pointer`}
              >
                <Settings className="size-5" />
                {open && <span>Configuración</span>}
              </Button>
            </Link>
          </TooltipShow>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

export default MySidebar;

const TooltipShow = ({ children, open, content }: { children: React.ReactNode; open: boolean; content: string }) => {
  
  if (open) {
    return children;
  }
  
  return (
    <Tooltip>
      <TooltipTrigger className="w-full" asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{content}</p>
      </TooltipContent>
    </Tooltip>
  );
};
