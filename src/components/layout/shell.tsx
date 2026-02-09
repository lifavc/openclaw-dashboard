"use client";

import { Sidebar } from "./sidebar";
import { GatewayProvider } from "@/hooks/use-gateway";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <GatewayProvider>
      <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
        <Sidebar />
        <main className="ml-64 flex-1">
          <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
        </main>
      </div>
    </GatewayProvider>
  );
}
