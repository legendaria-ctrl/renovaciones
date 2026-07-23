"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSesion } from "@/lib/session-context";
import { useSidebarDrawer } from "@/lib/sidebar-drawer-context";
import { usePendientes } from "@/lib/pendientes-context";
import { puedeAsignar, esAdmin } from "@/lib/constants";
import {
  LayoutGrid,
  Users,
  Hourglass,
  LogOut,
  X,
  UploadCloud,
  BadgeDollarSign,
  BarChart3,
} from "lucide-react";

const linksBase = [{ href: "/", label: "Leads", icon: LayoutGrid }];

const linksCoordinador = [{ href: "/pendientes", label: "Pendientes", icon: Hourglass }];

const linksAdmin = [
  { href: "/vendedores", label: "Equipo", icon: Users },
  { href: "/comisiones", label: "Comisiones", icon: BadgeDollarSign },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/importar", label: "Importar leads", icon: UploadCloud },
];

export function Sidebar() {
  const pathname = usePathname();
  const { usuario, cerrarSesion } = useSesion();
  const { abierto, setAbierto } = useSidebarDrawer();
  const { cantidad } = usePendientes();

  const items = [
    ...linksBase,
    ...(puedeAsignar(usuario?.rol) ? linksCoordinador : []),
    ...(esAdmin(usuario?.rol) ? linksAdmin : []),
  ];

  const inicial = usuario?.nombre?.trim().charAt(0).toUpperCase() || "?";

  function Nav({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <>
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`group relative flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all duration-500 ease-spring ${
                active
                  ? "bg-primary text-white shadow-[0_10px_24px_-8px_rgba(10,92,255,0.5)]"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              <Icon
                className={`h-4 w-4 flex-none transition-transform duration-500 ease-spring group-hover:translate-x-0.5 ${
                  active ? "text-white" : "text-muted"
                }`}
                strokeWidth={1.5}
              />
              {label}
              {href === "/pendientes" && cantidad > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white">
                  {cantidad}
                </span>
              )}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <>
      {abierto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 animate-fade-in-fast"
            onClick={() => setAbierto(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[80vw] flex-col gap-4 bg-surface p-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-deep text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgba(10,92,255,0.5)]">
                  {inicial}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{usuario?.nombre ?? "…"}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted">{usuario?.rol ?? ""}</p>
                </div>
              </div>
              <button
                onClick={() => setAbierto(false)}
                className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-silver-deep/60 bg-surface-2 text-muted"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
              <Nav onNavigate={() => setAbierto(false)} />
            </nav>

            <button
              onClick={() => cerrarSesion()}
              className="group flex items-center justify-center gap-2 rounded-xl border border-silver-deep/60 bg-surface-2 py-2.5 text-xs font-medium text-muted transition-all duration-500 ease-spring hover:border-danger/30 hover:text-danger active:scale-[0.98]"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      <aside className="hidden w-full flex-col gap-4 md:sticky md:top-[calc(env(safe-area-inset-top,0px)+2.5rem)] md:flex md:max-h-[calc(100vh-2.5rem-env(safe-area-inset-top,0px)-1.5rem)] md:w-64">
        <Link
          href="/"
          className="flex h-[84px] w-full flex-none items-center justify-center gap-3 overflow-hidden rounded-[1.5rem] bg-white shadow-[0_10px_24px_-10px_rgba(11,18,32,0.35)] transition-transform duration-500 ease-spring active:scale-[0.98]"
        >
          <Image src="/renovacion-logo.png" alt="Renovaciones" width={40} height={40} priority className="h-10 w-10" />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Renovaciones<span className="text-primary">.</span>
          </span>
        </Link>

        <div className="shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] p-2 diffused">
          <nav className="core flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto rounded-[calc(1.75rem-0.5rem)] p-2">
            <Nav />
          </nav>
        </div>

        <div className="shell flex-none rounded-[1.75rem] p-2 diffused">
          <div className="core flex flex-col gap-3 rounded-[calc(1.75rem-0.5rem)] p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-deep text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgba(10,92,255,0.5)]">
                {inicial}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{usuario?.nombre ?? "…"}</p>
                <p className="text-[11px] uppercase tracking-wider text-muted">{usuario?.rol ?? ""}</p>
              </div>
            </div>
            <button
              onClick={() => cerrarSesion()}
              className="group flex items-center justify-center gap-2 rounded-xl border border-silver-deep/60 bg-surface-2 py-2 text-xs font-medium text-muted transition-all duration-500 ease-spring hover:border-danger/30 hover:text-danger active:scale-[0.98]"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
