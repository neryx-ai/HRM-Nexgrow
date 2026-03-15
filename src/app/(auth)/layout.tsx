import { ModeToggle } from "@/components/theme/mode-toggle";
import React from "react";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed top-5 right-5">
        <ModeToggle />
      </div>
      <main className="w-full">{children}</main>
    </>
  );
}

export default DashboardLayout;
