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
} from "../ui/sidebar";
import Link from "next/link";
import { Button } from "../ui/button";
import {
  BookUser,
  Building2,
  ChartArea,
  LayoutDashboard,
  Settings,
  TreePalm,
  Wallet,
} from "lucide-react";

function MySidebar() {
  return (
    <Sidebar variant="floating">
      <SidebarHeader>
        <h2 className="text-lg font-semibold m-auto py-3">LOGO</h2>
      </SidebarHeader>
      <SidebarSeparator className="ml-0" />
      <SidebarContent>
        <SidebarGroup className="space-y-2">
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenuItem>
            <Link href="/">
              <Button
                variant="ghost"
                className="w-full justify-start text-base cursor-pointer"
              >
                <LayoutDashboard className="size-5" />
                <span>Dashboard</span>
              </Button>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/employees">
              <Button
                variant="ghost"
                className="w-full justify-start text-base cursor-pointer"
              >
                <BookUser className="size-5" />
                <span>Empleados</span>
              </Button>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/branches">
              <Button
                variant="ghost"
                className="w-full justify-start text-base cursor-pointer"
              >
                <Building2 className="size-5" />
                <span>Sucursales</span>
              </Button>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/payroll">
              <Button
                variant="ghost"
                className="w-full justify-start text-base cursor-pointer"
              >
                <Wallet className="size-5" />
                <span>Planilla</span>
              </Button>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/vacations">
              <Button
                variant="ghost"
                className="w-full justify-start text-base cursor-pointer"
              >
                <TreePalm className="size-5" />
                <span>Vacaciones</span>
              </Button>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/check-in-out">
              <Button
                variant="ghost"
                className="w-full justify-start text-base cursor-pointer"
              >
                <ChartArea className="size-5" />
                <span>Check In/Out</span>
              </Button>
            </Link>
          </SidebarMenuItem>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenuItem>
          <Link href="/settings">
            <Button
              variant="ghost"
              className="w-full justify-start text-base cursor-pointer"
            >
              <Settings className="size-5" />
              <span>Configuración</span>
            </Button>
          </Link>
        </SidebarMenuItem>
      </SidebarFooter>
    </Sidebar>
  );
}

export default MySidebar;
