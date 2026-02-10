"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { GatewayProvider } from "@/hooks/use-gateway";
import { HealthBar } from "@/components/ui/health-bar";
import { ToastContainer } from "@/components/ui/toast";

export function Shell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <GatewayProvider>
      <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-1 flex-col lg:ml-64">
          <HealthBar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
          </main>
        </div>
      </div>
      <ToastContainer />
    </GatewayProvider>
  );
}
