"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, X, ExternalLink } from "lucide-react";
import { listarPendientes, resolverSolicitud } from "@/lib/pendientesService";
import { usePendientes } from "@/lib/pendientes-context";
import { useSesion } from "@/lib/session-context";
import { aFecha } from "@/lib/membership";
import { TIPOS_SOLICITUD, TIPO_SOLICITUD_LABEL } from "@/lib/constants";
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
    await resolverSolicitud(solicitud, aprobar, usuario.id, usuario.nombre);
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
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{s.leadNombre}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        s.tipo === TIPOS_SOLICITUD.PAGO ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                      }`}
                    >
                      {TIPO_SOLICITUD_LABEL[s.tipo]}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    {s.tipoMembresia} · ${s.monto.toLocaleString("es-MX")} {s.moneda} · registrado por{" "}
                    {s.vendedorNombre}
                  </p>
                  {s.comprobanteUrl && (
                    <a
                      href={s.comprobanteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 flex w-fit items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Ver comprobante <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                    </a>
                  )}
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
