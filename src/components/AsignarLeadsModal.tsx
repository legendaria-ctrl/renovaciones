"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Usuario } from "@/lib/types";

export function AsignarLeadsModal({
  vendedores,
  onCancelar,
  onConfirmar,
}: {
  vendedores: Usuario[];
  onCancelar: () => void;
  onConfirmar: (vendedorIds: string[], cantidadPorVendedor: number) => void | Promise<void>;
}) {
  const [activos, setActivos] = useState<Set<string>>(new Set());
  const [cantidad, setCantidad] = useState(5);
  const [enviando, setEnviando] = useState(false);

  function toggle(id: string) {
    setActivos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirmar() {
    setEnviando(true);
    await onConfirmar(Array.from(activos), cantidad);
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

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
              Vendedores participantes
            </p>
            <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
              {vendedores.map((v) => (
                <label
                  key={v.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-2"
                >
                  <input
                    type="checkbox"
                    checked={activos.has(v.id)}
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
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Leads por vendedor
            </span>
            <input
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(parseInt(e.target.value, 10) || 1)}
              className="rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none"
            />
          </label>

          <button
            onClick={confirmar}
            disabled={activos.size === 0 || enviando}
            className="rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-50"
          >
            {enviando ? "Asignando…" : "Confirmar asignación"}
          </button>
        </div>
      </div>
    </div>
  );
}
