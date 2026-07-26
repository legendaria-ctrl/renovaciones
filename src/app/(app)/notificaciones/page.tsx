"use client";

import { useState } from "react";
import { Bell, X } from "lucide-react";
import { useSesion } from "@/lib/session-context";
import { useAvisos } from "@/lib/avisos-context";
import { Aviso } from "@/lib/avisosService";
import { aFecha } from "@/lib/membership";

export default function NotificacionesPage() {
  const { usuario } = useSesion();
  const { avisos, marcarLeido } = useAvisos();
  const [abierto, setAbierto] = useState<Aviso | null>(null);

  if (!usuario) return <p className="py-8 text-center text-sm text-muted">Cargando…</p>;

  function abrirLectura(a: Aviso) {
    setAbierto(a);
    marcarLeido(a);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Avisos</h1>
        <p className="mt-1 text-sm text-muted">Aquí quedan guardados todos los avisos que has recibido.</p>
      </div>

      <div className="shell rounded-[1.75rem] p-2 diffused">
        <div className="core rounded-[calc(1.75rem-0.5rem)] p-2">
          {avisos.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <Bell className="h-6 w-6 text-muted" strokeWidth={1.5} />
              <p className="text-sm text-muted">Todavía no tienes ningún aviso.</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-silver/60">
              {avisos.map((a) => {
                const leido = a.leidoPor.includes(usuario.nombre);
                const fecha = aFecha(a.creadoEn);
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => abrirLectura(a)}
                      className="w-full rounded-2xl text-left transition-colors duration-300 hover:bg-surface-2"
                    >
                      <div
                        className={`flex flex-col gap-1 rounded-2xl px-4 py-4 transition-colors duration-300 ${
                          leido ? "bg-transparent" : "bg-primary-dim"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">Aviso de {a.autorNombre}</p>
                          {!leido && <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-primary" />}
                        </div>
                        <p className="line-clamp-2 text-sm text-muted">{a.mensaje}</p>
                        {fecha && (
                          <p className="text-xs text-muted/70">
                            {fecha.toLocaleDateString("es-MX")}{" "}
                            {fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 animate-fade-in-fast" onClick={() => setAbierto(null)} />
          <div className="animate-fade-in relative flex w-full max-w-md flex-col gap-3 rounded-[2rem] bg-surface p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">Aviso de {abierto.autorNombre}</p>
              <button
                onClick={() => setAbierto(null)}
                className="flex h-8 w-8 flex-none items-center justify-center rounded-xl text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm text-muted">{abierto.mensaje}</p>
            {aFecha(abierto.creadoEn) && (
              <p className="text-xs text-muted/70">
                {aFecha(abierto.creadoEn)!.toLocaleDateString("es-MX")}{" "}
                {aFecha(abierto.creadoEn)!.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
