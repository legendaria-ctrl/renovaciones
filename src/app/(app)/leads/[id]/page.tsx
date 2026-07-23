"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Phone, Mail, MapPin, MessageSquareOff, CircleDollarSign, HandCoins, NotebookPen } from "lucide-react";
import { obtenerLead, listarNotasLead, registrarAccionLead } from "@/lib/leadsService";
import { crearSolicitudAbono } from "@/lib/pendientesService";
import { usePendientes } from "@/lib/pendientes-context";
import { useSesion } from "@/lib/session-context";
import { estadoDesdeVencimiento, aFecha } from "@/lib/membership";
import { ACCIONES_LEAD, ACCION_LABEL, MEMBRESIA_LABEL } from "@/lib/constants";
import { Lead, NotaLead } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

export default function LeadDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { usuario } = useSesion();
  const { refrescar: refrescarPendientes } = usePendientes();

  const [lead, setLead] = useState<Lead | null>(null);
  const [notas, setNotas] = useState<NotaLead[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accionAbierta, setAccionAbierta] = useState<null | "ABONO" | "NOTA">(null);
  const [texto, setTexto] = useState("");
  const [monto, setMonto] = useState(0);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [l, n] = await Promise.all([obtenerLead(id), listarNotasLead(id)]);
      setLead(l);
      setNotas(n);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el lead.");
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function registrarSimple(tipo: "PAGO" | "NO_CONTACTAR") {
    if (!usuario || !lead) return;
    setEnviando(true);
    await registrarAccionLead({
      leadId: lead.id,
      autorId: usuario.id,
      autorNombre: usuario.nombre,
      tipo: ACCIONES_LEAD[tipo],
      texto: ACCION_LABEL[ACCIONES_LEAD[tipo]],
    });
    setEnviando(false);
    cargar();
  }

  async function enviarNota() {
    if (!usuario || !lead || !texto.trim()) return;
    setEnviando(true);
    await registrarAccionLead({
      leadId: lead.id,
      autorId: usuario.id,
      autorNombre: usuario.nombre,
      tipo: ACCIONES_LEAD.NOTA,
      texto: texto.trim(),
    });
    setTexto("");
    setAccionAbierta(null);
    setEnviando(false);
    cargar();
  }

  async function enviarAbono() {
    if (!usuario || !lead || monto <= 0) return;
    setEnviando(true);
    await crearSolicitudAbono({
      leadId: lead.id,
      leadNombre: lead.nombre,
      vendedorId: usuario.id,
      vendedorNombre: usuario.nombre,
      monto,
      tipoMembresia: lead.liveMeses ? MEMBRESIA_LABEL.LIVE : MEMBRESIA_LABEL.SINERGETICO,
      notas: texto.trim(),
    });
    setMonto(0);
    setTexto("");
    setAccionAbierta(null);
    setEnviando(false);
    refrescarPendientes();
    cargar();
  }

  if (cargando) return <p className="py-8 text-center text-sm text-muted">Cargando…</p>;
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-sm text-danger">{error}</p>
        <button
          onClick={cargar}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          Reintentar
        </button>
      </div>
    );
  }
  if (!lead) return <p className="py-8 text-center text-sm text-muted">Lead no encontrado (id: {id}).</p>;

  const vencSinergetico = aFecha(lead.vencimientoSinergetico);
  const vencLive = aFecha(lead.vencimientoLive);

  return (
    <div className="flex flex-col gap-5">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        Volver
      </button>

      <div className="shell rounded-[1.75rem] p-2 diffused">
        <div className="core flex flex-col gap-4 rounded-[calc(1.75rem-0.5rem)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-foreground">{lead.nombre}</h1>
              <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted">
                {lead.correo && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" strokeWidth={1.75} /> {lead.correo}
                  </span>
                )}
                {lead.telefono && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" strokeWidth={1.75} /> {lead.telefono}
                  </span>
                )}
                {lead.ciudad && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} /> {lead.ciudad}
                  </span>
                )}
              </div>
            </div>
            {lead.noContactar && (
              <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-medium text-danger">
                No quiere ser contactado
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                {MEMBRESIA_LABEL.SINERGETICO}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-foreground">
                  Vence {vencSinergetico?.toLocaleDateString("es-MX") ?? "—"}
                </span>
                <StatusBadge estado={estadoDesdeVencimiento(vencSinergetico)} />
              </div>
            </div>
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                {MEMBRESIA_LABEL.LIVE}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-foreground">
                  {vencLive ? `Vence ${vencLive.toLocaleDateString("es-MX")}` : "Nunca comprada"}
                </span>
                <StatusBadge estado={estadoDesdeVencimiento(vencLive)} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => registrarSimple("PAGO")}
              disabled={enviando}
              className="flex items-center gap-2 rounded-xl bg-success/10 px-4 py-2.5 text-sm font-medium text-success transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-50"
            >
              <CircleDollarSign className="h-4 w-4" strokeWidth={1.75} />
              Pagó / Renovó
            </button>
            <button
              onClick={() => setAccionAbierta("ABONO")}
              disabled={enviando}
              className="flex items-center gap-2 rounded-xl bg-warning/10 px-4 py-2.5 text-sm font-medium text-warning transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-50"
            >
              <HandCoins className="h-4 w-4" strokeWidth={1.75} />
              Dio abono
            </button>
            <button
              onClick={() => setAccionAbierta("NOTA")}
              disabled={enviando}
              className="flex items-center gap-2 rounded-xl bg-surface-2 px-4 py-2.5 text-sm font-medium text-muted transition-all duration-500 ease-spring hover:text-foreground active:scale-[0.98] disabled:opacity-50"
            >
              <NotebookPen className="h-4 w-4" strokeWidth={1.75} />
              Agregar nota
            </button>
            {!lead.noContactar && (
              <button
                onClick={() => registrarSimple("NO_CONTACTAR")}
                disabled={enviando}
                className="flex items-center gap-2 rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-50"
              >
                <MessageSquareOff className="h-4 w-4" strokeWidth={1.75} />
                No quiere contacto
              </button>
            )}
          </div>

          {accionAbierta && (
            <div className="rounded-2xl bg-surface-2 p-4">
              {accionAbierta === "ABONO" && (
                <label className="mb-3 flex flex-col gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">Monto del abono</span>
                  <input
                    type="number"
                    min={1}
                    value={monto || ""}
                    onChange={(e) => setMonto(parseFloat(e.target.value) || 0)}
                    className="rounded-xl border border-silver-deep/60 bg-surface px-4 py-2.5 text-sm outline-none"
                  />
                </label>
              )}
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted">
                  {accionAbierta === "ABONO" ? "Notas (opcional)" : "Nota"}
                </span>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={3}
                  className="rounded-xl border border-silver-deep/60 bg-surface px-4 py-2.5 text-sm outline-none"
                />
              </label>
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => setAccionAbierta(null)} className="px-4 py-2 text-sm text-muted">
                  Cancelar
                </button>
                <button
                  onClick={accionAbierta === "ABONO" ? enviarAbono : enviarNota}
                  disabled={enviando}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {accionAbierta === "ABONO" ? "Enviar a autorización" : "Guardar nota"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shell rounded-[1.75rem] p-2 diffused">
        <div className="core flex flex-col gap-3 rounded-[calc(1.75rem-0.5rem)] p-6">
          <h2 className="text-sm font-semibold text-foreground">Actividad</h2>
          {notas.length === 0 ? (
            <p className="text-sm text-muted">Sin actividad registrada.</p>
          ) : (
            <div className="flex flex-col divide-y divide-silver/60">
              {notas.map((n) => (
                <div key={n.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{ACCION_LABEL[n.tipo]}</span>
                    <span className="text-xs text-muted">
                      {aFecha(n.creadoEn)?.toLocaleString("es-MX")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{n.texto}</p>
                  <p className="mt-1 text-xs text-muted">por {n.autorNombre}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
