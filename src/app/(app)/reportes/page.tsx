"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { listarActividadRango, listarTodaLaActividadRango, resumirPorVendedor, ResumenVendedor } from "@/lib/reportesService";
import { ACCION_LABEL } from "@/lib/constants";
import { NotaLead } from "@/lib/types";
import { aFecha } from "@/lib/membership";

function csvEscapar(valor: string | number): string {
  const texto = String(valor ?? "");
  return `"${texto.replace(/"/g, '""')}"`;
}

function descargarActividadCSV(actividad: NotaLead[], desde: string, hasta: string) {
  const encabezado = ["Fecha", "Tipo", "Lead", "Autor", "Texto", "Monto", "Moneda", "Deshecho"];
  const filas = actividad.map((n) => [
    aFecha(n.creadoEn)?.toLocaleString("es-MX") ?? "",
    ACCION_LABEL[n.tipo],
    n.leadId,
    n.autorNombre,
    n.texto,
    n.monto ?? "",
    n.moneda ?? "",
    n.deshecho ? "Si" : "No",
  ]);
  const csv = [encabezado, ...filas].map((fila) => fila.map(csvEscapar).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `actividad_${desde}_a_${hasta}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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
  const [actividad, setActividad] = useState<NotaLead[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buscar() {
    setCargando(true);
    setError(null);
    try {
      const desdeFecha = new Date(desde);
      const hastaFecha = new Date(`${hasta}T23:59:59`);
      const [renovaciones, todaLaActividad] = await Promise.all([
        listarActividadRango(desdeFecha, hastaFecha),
        listarTodaLaActividadRango(desdeFecha, hastaFecha),
      ]);
      setResumen(resumirPorVendedor(renovaciones));
      setActividad(todaLaActividad);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el reporte.");
    } finally {
      setCargando(false);
    }
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

          {error && <p className="text-sm text-danger">{error}</p>}

          {resumen && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-foreground">Renovaciones por vendedor</h2>
              <div className="flex flex-col divide-y divide-silver/60">
                {resumen.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">Sin renovaciones en este rango.</p>
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
            </div>
          )}
        </div>
      </div>

      {actividad && (
        <div className="shell rounded-[1.75rem] p-2 diffused">
          <div className="core flex flex-col gap-1 rounded-[calc(1.75rem-0.5rem)] p-4">
            <div className="flex items-center justify-between px-2 pb-2">
              <h2 className="text-sm font-semibold text-foreground">Actividad detallada ({actividad.length})</h2>
              <button
                onClick={() => descargarActividadCSV(actividad, desde, hasta)}
                disabled={actividad.length === 0}
                className="flex items-center gap-1.5 rounded-lg border border-silver-deep/60 bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                Descargar CSV
              </button>
            </div>
            {actividad.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Sin actividad en este rango.</p>
            ) : (
              <div className="flex max-h-[32rem] flex-col divide-y divide-silver/60 overflow-y-auto">
                {actividad.map((n) => (
                  <div key={n.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{ACCION_LABEL[n.tipo]}</span>
                        {n.deshecho && (
                          <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">
                            Deshecho
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted">
                        {n.texto} {n.monto ? `· $${n.monto.toLocaleString("es-MX")} ${n.moneda ?? ""}` : ""}
                      </p>
                      <p className="text-xs text-muted">por {n.autorNombre}</p>
                    </div>
                    <span className="text-xs text-muted">{aFecha(n.creadoEn)?.toLocaleString("es-MX")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
