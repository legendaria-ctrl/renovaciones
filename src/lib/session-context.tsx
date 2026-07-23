"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { ESTADOS_SOLICITUD, Rol } from "./constants";

export type Sesion = { id: string; nombre: string; rol: Rol } | null;

type SessionContextValue = {
  usuario: Sesion;
  cargando: boolean;
  refrescar: () => Promise<void>;
  establecerSesion: (sesion: Sesion) => void;
  cerrarSesion: (motivo?: string) => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Sesion>(null);
  const [cargando, setCargando] = useState(true);

  const refrescar = useCallback(async () => {
    const res = await fetch("/api/session");
    const data = await res.json();
    setUsuario(data.session);
    setCargando(false);
  }, []);

  const establecerSesion = useCallback((nueva: Sesion) => {
    setUsuario(nueva);
    setCargando(false);
  }, []);

  const cerrarSesion = useCallback(async (motivo?: string) => {
    await fetch("/api/session", { method: "DELETE" });
    setUsuario(null);
    window.location.href = motivo ? `/login?motivo=${motivo}` : "/login";
  }, []);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  // Corta el acceso al instante si le revocan el acceso, sin esperar a que
  // expire la cookie. Un único documento pequeño: barato de escuchar.
  useEffect(() => {
    if (!usuario) return;
    const unsub = onSnapshot(doc(db, "usuarios", usuario.id), (snap) => {
      const estado = snap.data()?.estado;
      if (snap.exists() && estado !== ESTADOS_SOLICITUD.APROBADO) {
        cerrarSesion("revocado");
      }
    });
    return () => unsub();
  }, [usuario, cerrarSesion]);

  return (
    <SessionContext.Provider value={{ usuario, cargando, refrescar, establecerSesion, cerrarSesion }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSesion() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSesion debe usarse dentro de SessionProvider");
  return ctx;
}
