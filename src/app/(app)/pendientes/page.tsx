"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, X } from "lucide-react";
import { listarPendientes, resolverSolicitud } from "@/lib/pendientesService";
import { usePendientes } from "@/lib/pendientes-context";
import { useSesion } from "@/lib/session-context";
import { aFecha } from "@/lib/membership";
import { SolicitudAbono } from "@/lib/types";

export default function PendientesPage() {
  const { usuario } = useSesion();
  const { refrescar } = usePendientes();
  const [solicitudes, setSolicitudes] = useState<SolicitudAbono[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setSolicitudes(await listarPendientes());
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function resolver(solicitud: SolicitudAbono, aprobar: boolean) {
    if (!usuario) return;
    setProcesando(solicitud.id);
    await resolverSolicitud(solicitud, aprobar, usuario.uid, usuario.nombre);
    setProcesando(null);
    await cargar();
    await refrescar();
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Pendientes de autorización</h1>

      <div className="shell rounded-[1.75rem] p-2 diffused">
        <div className="core flex flex-col divide-y divide-silver/60 rounded-[calc(1.75rem-0.5rem)] p-4">
          {cargando ? (
            <p className="py-8 text-center text-sm text-muted">Cargando…</p>
          ) : solicitudes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No hay abonos pendientes de aprobar.</p>
          ) : (
            solicitudes.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.leadNombre}</p>
                  <p className="text-xs text-muted">
                    {s.tipoMembresia} · ${s.monto.toLocaleString("es-MX")} · registrado por {s.vendedorNombre}
                  </p>
                  {s.notas && <p className="mt-1 text-xs text-muted">{s.notas}</p>}
                  <p className="mt-1 text-[11px] text-muted">
                    {aFecha(s.creadoEn)?.toLocaleString("es-MX")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => resolver(s, true)}
                    disabled={procesando === s.id}
                    className="flex items-center gap-1.5 rounded-xl bg-success/10 px-3 py-2 text-sm font-medium text-success disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" strokeWidth={1.75} />
                    Aprobar
                  </button>
                  <button
                    onClick={() => resolver(s, false)}
                    disabled={procesando === s.id}
                    className="flex items-center gap-1.5 rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger disabled:opacity-50"
                  >
                    <X className="h-4 w-4" strokeWidth={1.75} />
                    Rechazar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
