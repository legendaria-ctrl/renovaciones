"use client";

import { useEffect, useState, useCallback } from "react";
import { UserPlus } from "lucide-react";
import {
  listarUsuarios,
  crearUsuario,
  actualizarRol,
  activarDesactivarUsuario,
} from "@/lib/vendedoresService";
import { ROLES, ROL_LABEL, Rol } from "@/lib/constants";
import { Usuario } from "@/lib/types";

export default function VendedoresPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [formAbierto, setFormAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
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
    setError(null);
    setGuardando(true);
    try {
      await crearUsuario({ nombre, correo, clave, rol });
      setNombre("");
      setCorreo("");
      setClave("");
      setRol(ROLES.VENDEDOR);
      setFormAbierto(false);
      await cargar();
    } catch {
      setError("No se pudo crear el usuario. Verifica el correo y que la contraseña tenga al menos 6 caracteres.");
    } finally {
      setGuardando(false);
    }
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
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="rounded-xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm outline-none"
            />
            <input
              required
              type="email"
              placeholder="Correo"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="rounded-xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm outline-none"
            />
            <input
              required
              type="password"
              placeholder="Contraseña temporal"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              className="rounded-xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm outline-none"
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
              {guardando ? "Creando…" : "Crear usuario"}
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
                  <p className="text-xs text-muted">{u.correo}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={u.rol}
                    onChange={(e) => actualizarRol(u.id, e.target.value as Rol).then(cargar)}
                    className="rounded-xl border border-silver-deep/60 bg-surface-2 px-3 py-2 text-sm outline-none"
                  >
                    <option value={ROLES.VENDEDOR}>{ROL_LABEL.VENDEDOR}</option>
                    <option value={ROLES.COORDINADOR}>{ROL_LABEL.COORDINADOR}</option>
                    <option value={ROLES.ADMIN}>{ROL_LABEL.ADMIN}</option>
                  </select>
                  <button
                    onClick={() => activarDesactivarUsuario(u.id, !u.activo).then(cargar)}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition-all duration-500 ease-spring active:scale-[0.98] ${
                      u.activo ? "bg-success/10 text-success" : "bg-surface-2 text-muted"
                    }`}
                  >
                    {u.activo ? "Activo" : "Inactivo"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
