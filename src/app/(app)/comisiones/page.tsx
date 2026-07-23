"use client";

import { useEffect, useState, useCallback } from "react";
import { listarUsuarios, actualizarComision } from "@/lib/vendedoresService";
import { ROLES, MEMBRESIA_LABEL, TIPOS_MEMBRESIA } from "@/lib/constants";
import { Usuario } from "@/lib/types";

export default function ComisionesPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const todos = await listarUsuarios();
    setUsuarios(todos.filter((u) => u.rol === ROLES.VENDEDOR || u.rol === ROLES.COORDINADOR));
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function guardar(u: Usuario, tipo: string, valor: number) {
    setGuardando(u.id);
    await actualizarComision(u.id, { ...(u.comisionPorTipo ?? {}), [tipo]: valor });
    setGuardando(null);
    cargar();
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Comisiones</h1>
      <p className="text-sm text-muted">
        Define el porcentaje de comisión que gana cada vendedor por cada tipo de renovación.
      </p>

      <div className="shell rounded-[1.75rem] p-2 diffused">
        <div className="core flex flex-col divide-y divide-silver/60 rounded-[calc(1.75rem-0.5rem)] p-4">
          {cargando ? (
            <p className="py-8 text-center text-sm text-muted">Cargando…</p>
          ) : (
            usuarios.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{u.nombre}</p>
                  <p className="text-xs text-muted">{u.correo}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {Object.values(TIPOS_MEMBRESIA).map((tipo) => (
                    <label key={tipo} className="flex items-center gap-2 text-sm text-muted">
                      {MEMBRESIA_LABEL[tipo]}
                      <input
                        type="number"
                        min={0}
                        max={100}
                        defaultValue={u.comisionPorTipo?.[tipo] ?? 0}
                        onBlur={(e) => guardar(u, tipo, parseFloat(e.target.value) || 0)}
                        disabled={guardando === u.id}
                        className="w-20 rounded-xl border border-silver-deep/60 bg-surface-2 px-2 py-1.5 text-sm outline-none"
                      />
                      %
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
