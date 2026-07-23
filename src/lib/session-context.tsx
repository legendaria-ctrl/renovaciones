"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";
import { Rol } from "./constants";

export type Usuario = {
  uid: string;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
} | null;

type SessionContextValue = {
  usuario: Usuario;
  firebaseUser: User | null;
  cargando: boolean;
  cerrarSesion: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<Usuario>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUsuario(null);
        setCargando(false);
      }
    });
    return () => unsub();
  }, []);

  // Documento de perfil (rol, nombre, activo) en Firestore, uno por usuario.
  // Se escucha en vivo porque es un único doc pequeño: permite revocar acceso
  // al instante si un admin desactiva a alguien, sin gastar lecturas de listas.
  useEffect(() => {
    if (!firebaseUser) return;
    setCargando(true);
    const unsub = onSnapshot(doc(db, "usuarios", firebaseUser.uid), (snap) => {
      const data = snap.data();
      if (!data || data.activo === false) {
        setUsuario(null);
      } else {
        setUsuario({
          uid: firebaseUser.uid,
          nombre: data.nombre ?? firebaseUser.email ?? "",
          correo: data.correo ?? firebaseUser.email ?? "",
          rol: data.rol,
          activo: true,
        });
      }
      setCargando(false);
    });
    return () => unsub();
  }, [firebaseUser]);

  const cerrarSesion = useCallback(async () => {
    await signOut(auth);
    window.location.href = "/login";
  }, []);

  return (
    <SessionContext.Provider value={{ usuario, firebaseUser, cargando, cerrarSesion }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSesion() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSesion debe usarse dentro de SessionProvider");
  return ctx;
}
