import MyNavbar from "@/shared/components/navigation/navbar";
import MySidebar from "@/shared/components/navigation/sidebar";
import { SidebarProvider } from "@/shared/components/ui/sidebar";
import React from "react";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <MySidebar />
      <main className="w-full">
        <MyNavbar />
        {children}
      </main>
    </SidebarProvider>
  );
}

export default DashboardLayout;
