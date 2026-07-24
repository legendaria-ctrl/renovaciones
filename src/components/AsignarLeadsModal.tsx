"use client";

import { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { Usuario } from "@/lib/types";

export function AsignarLeadsModal({
  vendedores,
  totalDisponible,
  onCancelar,
  onConfirmar,
}: {
  vendedores: Usuario[];
  totalDisponible: number;
  onCancelar: () => void;
  onConfirmar: (asignaciones: { vendedorId: string; cantidad: number }[]) => void | Promise<void>;
}) {
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const seleccionados = vendedores.filter((v) => v.id in cantidades);
  const totalAsignado = seleccionados.reduce((acc, v) => acc + (cantidades[v.id] || 0), 0);
  const excedeDisponible = totalAsignado > totalDisponible;

  function toggle(id: string) {
    setCantidades((prev) => {
      const next = { ...prev };
      if (id in next) delete next[id];
      else next[id] = Math.min(5, totalDisponible);
      return next;
    });
  }

  function setCantidad(id: string, cantidad: number) {
    setCantidades((prev) => ({ ...prev, [id]: Math.min(cantidad, totalDisponible) }));
  }

  async function confirmar() {
    setEnviando(true);
    await onConfirmar(
      seleccionados.map((v) => ({ vendedorId: v.id, cantidad: Math.max(1, cantidades[v.id] || 1) }))
    );
    setEnviando(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in-fast">
      <div className="w-full max-w-md shell rounded-[1.75rem] p-2 diffused-lg">
        <div className="core flex flex-col gap-4 rounded-[calc(1.75rem-0.5rem)] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Asignar leads</h2>
            <button onClick={onCancelar} className="text-muted hover:text-foreground">
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>

          <div className="relative">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Vendedores</p>
            <button
              type="button"
              onClick={() => setMenuAbierto((v) => !v)}
              className="flex w-full items-center justify-between rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm text-foreground"
            >
              {seleccionados.length === 0
                ? "Selecciona uno o varios…"
                : `${seleccionados.length} vendedor${seleccionados.length === 1 ? "" : "es"} seleccionado${seleccionados.length === 1 ? "" : "s"}`}
              <ChevronDown className="h-4 w-4 text-muted" strokeWidth={1.75} />
            </button>
            {menuAbierto && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuAbierto(false)} />
                <div className="absolute left-0 top-full z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-silver-deep/60 bg-surface p-2 shadow-lg">
                  {vendedores.map((v) => (
                    <label
                      key={v.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-2"
                    >
                      <input
                        type="checkbox"
                        checked={v.id in cantidades}
                        onChange={() => toggle(v.id)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm text-foreground">{v.nombre}</span>
                      <span className="ml-auto text-[11px] uppercase tracking-wider text-muted">{v.rol}</span>
                    </label>
                  ))}
                  {vendedores.length === 0 && (
                    <p className="px-3 py-2 text-sm text-muted">No hay vendedores activos.</p>
                  )}
                </div>
              </>
            )}
          </div>

          {seleccionados.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">Leads por vendedor</p>
              <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
                {seleccionados.map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm text-foreground">{v.nombre}</span>
                    <input
                      type="number"
                      min={1}
                      max={totalDisponible}
                      value={cantidades[v.id] || ""}
                      onChange={(e) => setCantidad(v.id, parseInt(e.target.value, 10) || 1)}
                      className="w-24 flex-none rounded-xl border border-silver-deep/60 bg-surface-2 px-3 py-2 text-sm text-foreground outline-none"
                    />
                  </div>
                ))}
              </div>
              <p className={`text-xs ${excedeDisponible ? "text-danger" : "text-muted"}`}>
                Total a asignar: {totalAsignado} de {totalDisponible} lead{totalDisponible === 1 ? "" : "s"}{" "}
                disponible{totalDisponible === 1 ? "" : "s"}
                {excedeDisponible && " — sobran cupos, no hay suficientes leads para repartir todo eso"}
              </p>
            </div>
          )}

          <button
            onClick={confirmar}
            disabled={seleccionados.length === 0 || enviando}
            className="rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-50"
          >
            {enviando ? "Asignando…" : "Confirmar asignación"}
          </button>
        </div>
      </div>
    </div>
  );
}
