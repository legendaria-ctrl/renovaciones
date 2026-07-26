"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, Hourglass } from "lucide-react";
import { useSidebarDrawer } from "@/lib/sidebar-drawer-context";
import { usePendientes } from "@/lib/pendientes-context";
import { puedeAprobar } from "@/lib/constants";
import { useSesion } from "@/lib/session-context";
import { AvisosBell } from "@/components/AvisosBell";

export function MobileTopBar() {
  const { setAbierto } = useSidebarDrawer();
  const { usuario } = useSesion();
  const { cantidad } = usePendientes();

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setAbierto(true)}
        title="Abrir menú"
        className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-2xl border border-silver-deep/60 bg-surface-2 text-muted transition-all duration-500 ease-spring active:scale-[0.98]"
      >
        <Menu className="h-5 w-5" strokeWidth={1.75} />
      </button>
      <Link
        href="/"
        className="flex h-[52px] flex-1 items-center justify-center overflow-hidden rounded-2xl bg-white px-3 shadow-[0_10px_24px_-10px_rgba(11,18,32,0.35)] transition-transform duration-500 ease-spring active:scale-[0.98]"
      >
        <Image
          src="/renovacion-logo-full.png"
          alt="Renovaciones"
          width={2549}
          height={828}
          className="h-8 w-auto"
        />
      </Link>

      {puedeAprobar(usuario?.rol) && (
        <Link
          href="/pendientes"
          title="Pendientes"
          className="relative flex h-[52px] w-[52px] flex-none items-center justify-center rounded-2xl border border-silver-deep/60 bg-surface-2 text-muted transition-all duration-500 ease-spring active:scale-[0.98]"
        >
          <Hourglass className="h-5 w-5" strokeWidth={1.75} />
          {cantidad > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-semibold text-white">
              {cantidad}
            </span>
          )}
        </Link>
      )}
      <AvisosBell />
    </div>
  );
}
