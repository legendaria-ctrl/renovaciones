"use client";

import { SessionProvider } from "@/lib/session-context";
import { PendientesProvider } from "@/lib/pendientes-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PendientesProvider>{children}</PendientesProvider>
    </SessionProvider>
  );
}
