"use client";

import { useState } from "react";
import { RefreshCw, LoaderCircle } from "lucide-react";
import { obtenerLeadsDelSheet, limpiarCacheSheet } from "@/lib/sheetService";
import { obtenerOverlays, limpiarCacheOverlays } from "@/lib/overlayService";

export default function ImportarPage() {
  const [cargando, setCargando] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function actualizar() {
    setCargando(true);
    setError(null);
    try {
      limpiarCacheSheet();
      limpiarCacheOverlays();
      const [leads] = await Promise.all([obtenerLeadsDelSheet(true), obtenerOverlays(true)]);
      setTotal(leads.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer el sheet.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Actualizar datos</h1>

      <div className="shell rounded-[1.75rem] p-2 diffused">
        <div className="core flex flex-col items-start gap-4 rounded-[calc(1.75rem-0.5rem)] p-6">
          <p className="text-sm text-muted">
            Los leads se leen en vivo desde el Google Sheet — no se copian a la base de datos, así
            que no hay límite de escrituras que agotar. Este botón solo refresca la caché del
            navegador (útil si acabas de agregar filas nuevas al sheet y quieres verlas de una vez,
            sin esperar a que expire la caché por su cuenta).
          </p>

          <button
            onClick={actualizar}
            disabled={cargando}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white shadow-[0_10px_24px_-8px_rgba(10,92,255,0.5)] transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-60"
          >
            {cargando ? (
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
            )}
            {cargando ? "Actualizando…" : "Actualizar desde el sheet"}
          </button>

          {total !== null && (
            <div className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-foreground">
              {total.toLocaleString("es-MX")} leads leídos del sheet.
            </div>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </div>
    </div>
  );
}
