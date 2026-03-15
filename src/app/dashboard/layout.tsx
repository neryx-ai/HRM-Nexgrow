import MyNavbar from "@/components/navigation/navbar";
import MySidebar from "@/components/navigation/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
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
