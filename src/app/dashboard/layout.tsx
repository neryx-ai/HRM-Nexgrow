import MyNavbar from "@/components/navigation/navbar";
import MySidebar from "@/components/navigation/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import React from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <SidebarProvider>
      <MySidebar session={session} />
      <main className="w-full overflow-x-hidden">
        <MyNavbar />
        {children}
      </main>
    </SidebarProvider>
  );
}

export default DashboardLayout;
