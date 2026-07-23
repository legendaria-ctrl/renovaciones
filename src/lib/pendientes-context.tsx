"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { contarPendientes } from "./pendientesService";
import { useSesion } from "./session-context";
import { puedeAprobar } from "./constants";

type PendientesValue = {
  cantidad: number;
  refrescar: () => Promise<void>;
};

const PendientesContext = createContext<PendientesValue | null>(null);

// Carga manual/puntual (no listener): getCountFromServer es una sola lectura
// agregada, así que es barato refrescarla al entrar y tras aprobar/rechazar.
export function PendientesProvider({ children }: { children: ReactNode }) {
  const { usuario } = useSesion();
  const [cantidad, setCantidad] = useState(0);

  const refrescar = useCallback(async () => {
    if (!usuario || !puedeAprobar(usuario.rol)) {
      setCantidad(0);
      return;
    }
    setCantidad(await contarPendientes());
  }, [usuario]);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  return (
    <PendientesContext.Provider value={{ cantidad, refrescar }}>
      {children}
    </PendientesContext.Provider>
  );
}

export function usePendientes() {
  const ctx = useContext(PendientesContext);
  if (!ctx) throw new Error("usePendientes debe usarse dentro de PendientesProvider");
  return ctx;
}
