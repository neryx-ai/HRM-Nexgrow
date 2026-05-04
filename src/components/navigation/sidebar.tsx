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
  Wallet,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

function MySidebar() {
  const { data: session } = authClient.useSession();

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
    <Sidebar variant="floating">
      <SidebarHeader>
        <div className="flex items-center justify-center py-3">
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary"
            aria-label="Jivis Logo"
          >
            <rect width="40" height="40" rx="8" fill="currentColor" opacity="0.1" />
            <text
              x="50%"
              y="55%"
              dominantBaseline="middle"
              textAnchor="middle"
              fill="currentColor"
              fontSize="18"
              fontWeight="bold"
            >
              J
            </text>
          </svg>
        </div>
      </SidebarHeader>
      <SidebarSeparator className="ml-0" />
      <SidebarContent>
        <SidebarGroup className="space-y-2">
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenuItem>
            <Link href="/dashboard">
              <Button
                variant="ghost"
                className="w-full justify-start text-base cursor-pointer"
              >
                <LayoutDashboard className="size-5" />
                <span>Dashboard</span>
              </Button>
            </Link>
          </SidebarMenuItem>

          {accessEmpleados && (
            <SidebarMenuItem>
              <Link href={`/dashboard/empleados`}>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-base cursor-pointer"
                >
                  <BookUser className="size-5" />
                  <span>
                    {session?.user.role === "empleado"
                      ? "Perfil empleado"
                      : "Empleados"}
                  </span>
                </Button>
              </Link>
            </SidebarMenuItem>
          )}

          {accessBranches && (
            <SidebarMenuItem>
              <Link href="/dashboard/sucursales">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-base cursor-pointer"
                >
                  <Building2 className="size-5" />
                  <span>Sucursales</span>
                </Button>
              </Link>
            </SidebarMenuItem>
          )}

          {accessBranches && (
            <SidebarMenuItem>
              <Link href="/dashboard/puestos">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-base cursor-pointer"
                >
                  <Briefcase className="size-5" />
                  <span>Puestos</span>
                </Button>
              </Link>
            </SidebarMenuItem>
          )}

          {accessPayrolls && (
            <SidebarMenuItem>
              <Link href="/dashboard/payroll">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-base cursor-pointer"
                >
                  <Wallet className="size-5" />
                  <span>Planilla</span>
                </Button>
              </Link>
            </SidebarMenuItem>
          )}

          {accessVacations && (
            <SidebarMenuItem>
              <Link href="/dashboard/vacations">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-base cursor-pointer"
                >
                  <TreePalm className="size-5" />
                  <span>Vacaciones</span>
                </Button>
              </Link>
            </SidebarMenuItem>
          )}

          {accessAttendance && (
            <SidebarMenuItem>
              <Link href="/dashboard/asistencia">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-base cursor-pointer"
                >
                  <ChartArea className="size-5" />
                  <span>Asistencia</span>
                </Button>
              </Link>
            </SidebarMenuItem>
          )}

          {accessReportes && (
            <SidebarMenuItem>
              <Link href="/dashboard/reportes">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-base cursor-pointer"
                >
                  <FileBarChart className="size-5" />
                  <span>Reportes</span>
                </Button>
              </Link>
            </SidebarMenuItem>
          )}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {accessConfiguration && (
          <SidebarMenuItem>
            <Link href="/dashboard/settings">
              <Button
                variant="ghost"
                className="w-full justify-start text-base cursor-pointer"
              >
                <Settings className="size-5" />
                <span>Configuración</span>
              </Button>
            </Link>
          </SidebarMenuItem>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

export default MySidebar;
