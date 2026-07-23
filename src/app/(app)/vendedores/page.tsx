"use client";

import { useEffect, useState, useCallback } from "react";
import { UserPlus, Check, X } from "lucide-react";
import {
  listarUsuarios,
  crearUsuarioAprobado,
  decidirSolicitud,
} from "@/lib/vendedoresService";
import { useSesion } from "@/lib/session-context";
import { ROLES, ROL_LABEL, ESTADOS_SOLICITUD, Rol } from "@/lib/constants";
import { Usuario } from "@/lib/types";

export default function VendedoresPage() {
  const { usuario } = useSesion();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [formAbierto, setFormAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<Rol>(ROLES.VENDEDOR);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setUsuarios(await listarUsuarios());
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario) return;
    setError(null);
    setGuardando(true);
    try {
      await crearUsuarioAprobado(nombre, rol, usuario.nombre);
      setNombre("");
      setRol(ROLES.VENDEDOR);
      setFormAbierto(false);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el usuario.");
    } finally {
      setGuardando(false);
    }
  }

  async function resolver(u: Usuario, estado: "APROBADO" | "RECHAZADO") {
    if (!usuario) return;
    await decidirSolicitud(u.id, estado, usuario.nombre);
    cargar();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Equipo</h1>
        <button
          onClick={() => setFormAbierto((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-[0_10px_24px_-8px_rgba(10,92,255,0.5)] transition-all duration-500 ease-spring active:scale-[0.98]"
        >
          <UserPlus className="h-4 w-4" strokeWidth={1.75} />
          Nuevo usuario
        </button>
      </div>

      {formAbierto && (
        <form onSubmit={crear} className="shell rounded-[1.75rem] p-2 diffused">
          <div className="core grid grid-cols-1 gap-3 rounded-[calc(1.75rem-0.5rem)] p-6 sm:grid-cols-2">
            <input
              required
              placeholder="Nombre (el mismo que usará para iniciar sesión)"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="rounded-xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm outline-none sm:col-span-2"
            />
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value as Rol)}
              className="rounded-xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm outline-none"
            >
              <option value={ROLES.VENDEDOR}>{ROL_LABEL.VENDEDOR}</option>
              <option value={ROLES.COORDINADOR}>{ROL_LABEL.COORDINADOR}</option>
              <option value={ROLES.ADMIN}>{ROL_LABEL.ADMIN}</option>
            </select>
            {error && <p className="sm:col-span-2 text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={guardando}
              className="sm:col-span-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {guardando ? "Creando…" : "Crear usuario (queda aprobado directo)"}
            </button>
          </div>
        </form>
      )}

      <div className="shell rounded-[1.75rem] p-2 diffused">
        <div className="core flex flex-col divide-y divide-silver/60 rounded-[calc(1.75rem-0.5rem)] p-4">
          {cargando ? (
            <p className="py-8 text-center text-sm text-muted">Cargando…</p>
          ) : (
            usuarios.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{u.nombre}</p>
                  <p className="text-xs text-muted">{ROL_LABEL[u.rol]}</p>
                </div>
                <div className="flex items-center gap-2">
                  {u.estado === ESTADOS_SOLICITUD.PENDIENTE ? (
                    <>
                      <button
                        onClick={() => resolver(u, "APROBADO")}
                        className="flex items-center gap-1.5 rounded-xl bg-success/10 px-3 py-2 text-sm font-medium text-success"
                      >
                        <Check className="h-4 w-4" strokeWidth={1.75} />
                        Aprobar
                      </button>
                      <button
                        onClick={() => resolver(u, "RECHAZADO")}
                        className="flex items-center gap-1.5 rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger"
                      >
                        <X className="h-4 w-4" strokeWidth={1.75} />
                        Rechazar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() =>
                        resolver(u, u.estado === ESTADOS_SOLICITUD.APROBADO ? "RECHAZADO" : "APROBADO")
                      }
                      className={`rounded-xl px-3 py-2 text-sm font-medium transition-all duration-500 ease-spring active:scale-[0.98] ${
                        u.estado === ESTADOS_SOLICITUD.APROBADO
                          ? "bg-success/10 text-success"
                          : "bg-surface-2 text-muted"
                      }`}
                    >
                      {u.estado === ESTADOS_SOLICITUD.APROBADO ? "Aprobado" : "Revocado"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
