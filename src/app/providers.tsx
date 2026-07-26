"use client";

import { SessionProvider } from "@/lib/session-context";
import { PendientesProvider } from "@/lib/pendientes-context";
import { AvisosProvider } from "@/lib/avisos-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PendientesProvider>
        <AvisosProvider>{children}</AvisosProvider>
      </PendientesProvider>
    </SessionProvider>
  );
}
