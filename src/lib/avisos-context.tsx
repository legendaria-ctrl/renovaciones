"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { listarAvisosRelevantes, marcarAvisoLeido, Aviso } from "./avisosService";
import { useSesion } from "./session-context";

const INTERVALO_POLL_MS = 90_000;

type AvisosValue = {
  avisos: Aviso[];
  noLeidas: number;
  refrescar: () => Promise<void>;
  marcarLeido: (aviso: Aviso) => Promise<void>;
};

const AvisosContext = createContext<AvisosValue | null>(null);

// Sin listener en tiempo real: se refresca al entrar y cada 90s mientras la
// pestaña esté abierta (getDocs con limit(100), barato). Coherente con el
// resto de la app, que evita onSnapshot salvo para el doc de sesión.
export function AvisosProvider({ children }: { children: ReactNode }) {
  const { usuario } = useSesion();
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const refrescar = useCallback(async () => {
    if (!usuario) {
      setAvisos([]);
      return;
    }
    setAvisos(await listarAvisosRelevantes(usuario));
  }, [usuario]);

  useEffect(() => {
    refrescar();
    if (!usuario) return;
    const id = setInterval(refrescar, INTERVALO_POLL_MS);
    return () => clearInterval(id);
  }, [usuario, refrescar]);

  const marcarLeido = useCallback(
    async (aviso: Aviso) => {
      if (!usuario || aviso.leidoPor.includes(usuario.nombre)) return;
      setAvisos((prev) =>
        prev.map((a) => (a.id === aviso.id ? { ...a, leidoPor: [...a.leidoPor, usuario.nombre] } : a))
      );
      await marcarAvisoLeido(aviso.id, aviso.leidoPor, usuario.nombre);
    },
    [usuario]
  );

  const noLeidas = usuario ? avisos.filter((a) => !a.leidoPor.includes(usuario.nombre)).length : 0;

  return (
    <AvisosContext.Provider value={{ avisos, noLeidas, refrescar, marcarLeido }}>
      {children}
    </AvisosContext.Provider>
  );
}

export function useAvisos() {
  const ctx = useContext(AvisosContext);
  if (!ctx) throw new Error("useAvisos debe usarse dentro de AvisosProvider");
  return ctx;
}
