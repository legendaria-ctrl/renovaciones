"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { seleccionarLeadsParaAsignar } from "@/lib/leadsService";
import { FiltroMembresia } from "@/lib/leadsService";
import { Lead } from "@/lib/types";

export function SeleccionarLeadsModal({
  membresia,
  onCancelar,
  onListo,
}: {
  membresia: FiltroMembresia;
  onCancelar: () => void;
  onListo: (leads: Lead[]) => void;
}) {
  const [vencidoDesde, setVencidoDesde] = useState("");
  const [vencidoHasta, setVencidoHasta] = useState("");
  const [cantidad, setCantidad] = useState(50);
  const [soloSinAsignar, setSoloSinAsignar] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [encontrados, setEncontrados] = useState<Lead[] | null>(null);

  async function buscar() {
    setBuscando(true);
    setEncontrados(null);
    const leads = await seleccionarLeadsParaAsignar({
      membresia,
      cantidad,
      vencidoDesde: vencidoDesde ? new Date(`${vencidoDesde}T00:00:00`) : null,
      vencidoHasta: vencidoHasta ? new Date(`${vencidoHasta}T23:59:59`) : null,
      soloSinAsignar,
    });
    setEncontrados(leads);
    setBuscando(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in-fast">
      <div className="w-full max-w-md shell rounded-[1.75rem] p-2 diffused-lg">
        <div className="core flex flex-col gap-4 rounded-[calc(1.75rem-0.5rem)] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Seleccionar leads vencidos</h2>
            <button onClick={onCancelar} className="text-muted hover:text-foreground">
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Vencido desde (opcional)
              </span>
              <input
                type="date"
                value={vencidoDesde}
                onChange={(e) => setVencidoDesde(e.target.value)}
                className="rounded-xl border border-silver-deep/60 bg-surface-2 px-3 py-2 text-sm text-foreground outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Vencido hasta (opcional)
              </span>
              <input
                type="date"
                value={vencidoHasta}
                onChange={(e) => setVencidoHasta(e.target.value)}
                className="rounded-xl border border-silver-deep/60 bg-surface-2 px-3 py-2 text-sm text-foreground outline-none"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">Cantidad de leads</span>
            <input
              type="number"
              min={1}
              value={cantidad || ""}
              onChange={(e) => setCantidad(parseInt(e.target.value, 10) || 1)}
              className="rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={soloSinAsignar}
              onChange={(e) => setSoloSinAsignar(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Solo leads sin asignar
          </label>

          {encontrados !== null && (
            <p className="text-sm text-muted">
              {encontrados.length === 0
                ? "No se encontraron leads con esos filtros."
                : `${encontrados.length} lead${encontrados.length === 1 ? "" : "s"} encontrado${encontrados.length === 1 ? "" : "s"}.`}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={buscar}
              disabled={buscando}
              className="flex-1 rounded-xl border border-silver-deep/60 bg-surface-2 py-2.5 text-sm font-medium text-foreground transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-50"
            >
              {buscando ? "Buscando…" : "Buscar leads"}
            </button>
            <button
              onClick={() => encontrados && onListo(encontrados)}
              disabled={!encontrados || encontrados.length === 0}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-50"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
