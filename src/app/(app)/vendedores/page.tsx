"use client";

import { useEffect, useState, useCallback } from "react";
import { UserPlus, Users, Check, X, Pencil } from "lucide-react";
import {
  listarUsuarios,
  crearUsuarioAprobado,
  crearUsuariosEnLote,
  editarUsuario,
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
  const [creandoLote, setCreandoLote] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editRol, setEditRol] = useState<Rol>(ROLES.VENDEDOR);
  const [errorEdit, setErrorEdit] = useState<string | null>(null);
  const [guardandoEdit, setGuardandoEdit] = useState(false);

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

  async function agregarDiezVendedores() {
    if (!usuario) return;
    setCreandoLote(true);
    const nombres = Array.from({ length: 10 }, (_, i) => `Vendedor ${i + 1}`);
    await crearUsuariosEnLote(nombres, ROLES.VENDEDOR, usuario.nombre);
    setCreandoLote(false);
    cargar();
  }

  function abrirEdicion(u: Usuario) {
    setEditandoId(u.id);
    setEditNombre(u.nombre);
    setEditRol(u.rol);
    setErrorEdit(null);
  }

  async function guardarEdicion(u: Usuario) {
    if (!usuario || !editNombre.trim()) return;
    setErrorEdit(null);
    setGuardandoEdit(true);
    try {
      await editarUsuario(u, editNombre, editRol, usuario.nombre);
      setEditandoId(null);
      await cargar();
    } catch (err) {
      setErrorEdit(err instanceof Error ? err.message : "No se pudo guardar el cambio.");
    } finally {
      setGuardandoEdit(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Equipo</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={agregarDiezVendedores}
            disabled={creandoLote}
            className="flex items-center gap-2 rounded-xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm font-medium text-foreground transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-50"
          >
            <Users className="h-4 w-4" strokeWidth={1.75} />
            {creandoLote ? "Agregando…" : "Agregar 10 vendedores"}
          </button>
          <button
            onClick={() => setFormAbierto((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-[0_10px_24px_-8px_rgba(10,92,255,0.5)] transition-all duration-500 ease-spring active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" strokeWidth={1.75} />
            Nuevo usuario
          </button>
        </div>
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
            usuarios.map((u) =>
              editandoId === u.id ? (
                <div key={u.id} className="flex flex-col gap-2 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      className="flex-1 rounded-xl border border-silver-deep/60 bg-surface-2 px-3 py-2 text-sm outline-none"
                    />
                    <select
                      value={editRol}
                      onChange={(e) => setEditRol(e.target.value as Rol)}
                      className="rounded-xl border border-silver-deep/60 bg-surface-2 px-3 py-2 text-sm outline-none"
                    >
                      <option value={ROLES.VENDEDOR}>{ROL_LABEL.VENDEDOR}</option>
                      <option value={ROLES.COORDINADOR}>{ROL_LABEL.COORDINADOR}</option>
                      <option value={ROLES.ADMIN}>{ROL_LABEL.ADMIN}</option>
                    </select>
                    <button
                      onClick={() => guardarEdicion(u)}
                      disabled={guardandoEdit}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" strokeWidth={1.75} />
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditandoId(null)}
                      className="flex items-center justify-center rounded-xl border border-silver-deep/60 bg-surface-2 px-3 py-2 text-muted"
                    >
                      <X className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </div>
                  {errorEdit && <p className="text-sm text-danger">{errorEdit}</p>}
                </div>
              ) : (
                <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.nombre}</p>
                    <p className="text-xs text-muted">{ROL_LABEL[u.rol]}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => abrirEdicion(u)}
                      title="Editar usuario"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-silver-deep/60 bg-surface-2 text-muted transition-all duration-500 ease-spring hover:text-foreground active:scale-[0.98]"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={1.75} />
                    </button>
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
              )
            )
          )}
        </div>
      </div>
    </div>
  );
}
