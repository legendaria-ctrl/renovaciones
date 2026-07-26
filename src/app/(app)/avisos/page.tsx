"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, Megaphone, Send, Users, UserRound } from "lucide-react";
import { useSesion } from "@/lib/session-context";
import { listarUsuarios } from "@/lib/vendedoresService";
import { ESTADOS_SOLICITUD, ROL_LABEL, esAdmin } from "@/lib/constants";
import { crearAviso, listarAvisosEnviados, Aviso, AudienciaAviso } from "@/lib/avisosService";
import { useAvisos } from "@/lib/avisos-context";
import { Usuario } from "@/lib/types";
import { aFecha } from "@/lib/membership";

export default function AvisosPage() {
  const { usuario } = useSesion();
  const { refrescar: refrescarBandeja } = useAvisos();
  const [personas, setPersonas] = useState<Usuario[]>([]);
  const [enviados, setEnviados] = useState<Aviso[]>([]);
  const [audiencia, setAudiencia] = useState<AudienciaAviso>("TODOS");
  const [destinatarios, setDestinatarios] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    const [todos, historial] = await Promise.all([listarUsuarios(), listarAvisosEnviados()]);
    setPersonas(
      todos
        .filter((u) => u.estado === ESTADOS_SOLICITUD.APROBADO && u.id !== usuario?.id)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
    );
    setEnviados(historial);
  };

  useEffect(() => {
    if (esAdmin(usuario?.rol)) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  const personasOrdenadas = useMemo(() => personas, [personas]);

  if (!usuario) return <p className="py-8 text-center text-sm text-muted">Cargando…</p>;

  if (!esAdmin(usuario.rol)) {
    return (
      <div className="shell rounded-[1.75rem] p-2 diffused">
        <div className="core flex flex-col items-center gap-3 rounded-[calc(1.75rem-0.5rem)] p-16 text-center">
          <ShieldAlert className="h-6 w-6 text-muted" strokeWidth={1.5} />
          <p className="text-sm text-muted">Solo un administrador puede dar avisos.</p>
        </div>
      </div>
    );
  }

  function alternarDestinatario(nombre: string) {
    setDestinatarios((prev) => (prev.includes(nombre) ? prev.filter((n) => n !== nombre) : [...prev, nombre]));
  }

  async function enviar() {
    if (!usuario || !mensaje.trim() || enviando) return;
    if (audiencia === "PRIVADO" && destinatarios.length === 0) return;
    setEnviando(true);
    setError(null);
    try {
      await crearAviso(usuario, audiencia, destinatarios, mensaje);
      setMensaje("");
      setDestinatarios([]);
      await cargar();
      await refrescarBandeja();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el aviso.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Dar avisos</h1>
        <p className="mt-1 text-sm text-muted">
          Envía un aviso general a todo el equipo o uno privado a personas específicas.
        </p>
      </div>

      <div className="shell rounded-[1.75rem] p-2 diffused">
        <div className="core flex flex-col gap-4 rounded-[calc(1.75rem-0.5rem)] p-6">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-1 sm:w-72">
            <button
              type="button"
              onClick={() => setAudiencia("TODOS")}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all duration-500 ease-spring ${
                audiencia === "TODOS"
                  ? "bg-surface text-primary shadow-[0_6px_16px_-6px_rgba(10,92,255,0.35)]"
                  : "text-muted"
              }`}
            >
              <Users className="h-4 w-4" strokeWidth={1.5} />
              General
            </button>
            <button
              type="button"
              onClick={() => setAudiencia("PRIVADO")}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all duration-500 ease-spring ${
                audiencia === "PRIVADO"
                  ? "bg-surface text-primary shadow-[0_6px_16px_-6px_rgba(10,92,255,0.35)]"
                  : "text-muted"
              }`}
            >
              <UserRound className="h-4 w-4" strokeWidth={1.5} />
              Privado
            </button>
          </div>

          {audiencia === "TODOS" ? (
            <p className="text-xs text-muted">Este aviso lo verá todo el equipo registrado (menos tú).</p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">Elige a quién va dirigido</p>
              {personasOrdenadas.length === 0 ? (
                <p className="text-xs text-muted">No hay más personas aprobadas todavía.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {personasOrdenadas.map((p) => {
                    const activo = destinatarios.includes(p.nombre);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => alternarDestinatario(p.nombre)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-500 ease-spring ${
                          activo ? "bg-primary text-white" : "bg-surface-2 text-muted hover:text-foreground"
                        }`}
                      >
                        {p.nombre}
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${
                            activo ? "bg-white/20" : "bg-black/5"
                          }`}
                        >
                          {ROL_LABEL[p.rol]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Escribe el aviso…"
            rows={3}
            className="w-full resize-none rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-3 text-sm text-foreground outline-none"
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            onClick={enviar}
            disabled={!mensaje.trim() || enviando || (audiencia === "PRIVADO" && destinatarios.length === 0)}
            className="flex w-fit items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-60"
          >
            <Send className="h-4 w-4" strokeWidth={1.75} />
            {enviando ? "Enviando…" : "Enviar aviso"}
          </button>
        </div>
      </div>

      <div className="shell rounded-[1.75rem] p-2 diffused">
        <div className="core flex flex-col gap-3 rounded-[calc(1.75rem-0.5rem)] p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Megaphone className="h-4 w-4 text-primary" strokeWidth={1.5} />
            Avisos enviados
          </h3>

          {enviados.length === 0 ? (
            <p className="text-sm text-muted">Todavía no se ha enviado ningún aviso.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-silver/60">
              {enviados.map((a) => (
                <li key={a.id} className="flex flex-col gap-1 py-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{a.autorNombre}</p>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                      {a.audiencia === "PRIVADO" ? `Privado: ${a.destinatarios.join(", ")}` : "General"}
                    </span>
                  </div>
                  <p className="text-sm text-muted">{a.mensaje}</p>
                  {aFecha(a.creadoEn) && (
                    <p className="text-xs text-muted/70">{aFecha(a.creadoEn)!.toLocaleString("es-MX")}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
