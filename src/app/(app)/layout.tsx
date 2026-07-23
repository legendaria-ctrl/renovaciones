"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { MobileTopBar } from "@/components/MobileTopBar";
import { PageTransition } from "@/components/PageTransition";
import { SidebarDrawerProvider } from "@/lib/sidebar-drawer-context";
import { useSesion } from "@/lib/session-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { usuario, cargando } = useSesion();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && !usuario) router.replace("/login");
  }, [cargando, usuario, router]);

  if (cargando || !usuario) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <SidebarDrawerProvider>
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-8 md:flex-row md:gap-6 md:px-8 md:pb-10">
        <div className="sticky top-0 z-30 -mx-4 flex flex-col gap-3 bg-background px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] md:hidden">
          <MobileTopBar />
        </div>

        <div className="md:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)]">
          <Sidebar />
        </div>

        <main className="min-w-0 flex-1 pt-6 md:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)]">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </SidebarDrawerProvider>
  );
}
