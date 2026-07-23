"use client";

import { useState } from "react";
import { listarActividadRango, resumirPorVendedor, ResumenVendedor } from "@/lib/reportesService";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function haceUnMesISO() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

export default function ReportesPage() {
  const [desde, setDesde] = useState(haceUnMesISO());
  const [hasta, setHasta] = useState(hoyISO());
  const [resumen, setResumen] = useState<ResumenVendedor[] | null>(null);
  const [cargando, setCargando] = useState(false);

  async function buscar() {
    setCargando(true);
    const actividad = await listarActividadRango(new Date(desde), new Date(`${hasta}T23:59:59`));
    setResumen(resumirPorVendedor(actividad));
    setCargando(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Reportes por rango de fecha</h1>

      <div className="shell rounded-[1.75rem] p-2 diffused">
        <div className="core flex flex-col gap-4 rounded-[calc(1.75rem-0.5rem)] p-6">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">Desde</span>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="rounded-xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">Hasta</span>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="rounded-xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm outline-none"
              />
            </label>
            <button
              onClick={buscar}
              disabled={cargando}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {cargando ? "Buscando…" : "Buscar"}
            </button>
          </div>

          {resumen && (
            <div className="flex flex-col divide-y divide-silver/60">
              {resumen.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">Sin actividad en este rango.</p>
              ) : (
                resumen.map((r) => (
                  <div key={r.autorId} className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium text-foreground">{r.autorNombre}</span>
                    <span className="text-sm text-muted">
                      {r.cantidad} renovaciones · ${r.totalMonto.toLocaleString("es-MX")}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
