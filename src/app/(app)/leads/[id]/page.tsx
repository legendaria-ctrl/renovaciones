"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  MessageSquareOff,
  CircleDollarSign,
  HandCoins,
  NotebookPen,
  User,
  PhoneCall,
  Activity,
} from "lucide-react";
import { obtenerLead, listarNotasLead, registrarAccionLead, actualizarLlamada } from "@/lib/leadsService";
import { crearSolicitud } from "@/lib/pendientesService";
import { usePendientes } from "@/lib/pendientes-context";
import { useSesion } from "@/lib/session-context";
import { estadoDesdeVencimiento, aFecha } from "@/lib/membership";
import {
  ACCIONES_LEAD,
  ACCION_LABEL,
  MEMBRESIA_LABEL,
  TIPOS_MEMBRESIA,
  ESTADOS_LLAMADA,
  LLAMADA_LABEL,
  MONEDAS,
  Moneda,
  EstadoLlamada,
} from "@/lib/constants";
import { Lead, NotaLead } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

type Tab = "RESUMEN" | "SEGUIMIENTO" | "ACTIVIDAD";

const TABS: { valor: Tab; label: string; icon: typeof User }[] = [
  { valor: "RESUMEN", label: "Resumen", icon: User },
  { valor: "SEGUIMIENTO", label: "Seguimiento", icon: PhoneCall },
  { valor: "ACTIVIDAD", label: "Actividad", icon: Activity },
];

const LLAMADA_ESTILO: Record<EstadoLlamada, string> = {
  SI: "bg-success/10 text-success border-success/20",
  NO_CONTESTO: "bg-warning/10 text-warning border-warning/20",
  NO: "bg-danger/10 text-danger border-danger/20",
  PROGRAMADA: "bg-primary/10 text-primary border-primary/20",
};

export default function LeadDetallePage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => decodeURIComponent(params.id), [params.id]);
  const router = useRouter();
  const { usuario } = useSesion();
  const { refrescar: refrescarPendientes } = usePendientes();

  const [tab, setTab] = useState<Tab>("RESUMEN");
  const [lead, setLead] = useState<Lead | null>(null);
  const [notas, setNotas] = useState<NotaLead[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accionAbierta, setAccionAbierta] = useState<null | "PAGO" | "ABONO" | "NOTA">(null);
  const [texto, setTexto] = useState("");
  const [monto, setMonto] = useState(0);
  const [moneda, setMoneda] = useState<Moneda>(MONEDAS.MXN);
  const [comprobanteUrl, setComprobanteUrl] = useState("");
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

  async function registrarSimple(tipo: "NO_CONTACTAR") {
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

  async function marcarLlamada(estado: EstadoLlamada) {
    if (!usuario || !lead) return;
    setEnviando(true);
    await actualizarLlamada(lead.id, estado, usuario.id, usuario.nombre);
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

  async function enviarSolicitud(tipo: "PAGO" | "ABONO") {
    if (!usuario || !lead || monto <= 0 || !comprobanteUrl.trim()) return;
    setEnviando(true);
    const tipoMembresiaKey = lead.liveMeses ? TIPOS_MEMBRESIA.LIVE : TIPOS_MEMBRESIA.SINERGETICO;
    await crearSolicitud({
      leadId: lead.id,
      leadNombre: lead.nombre,
      vendedorId: usuario.id,
      vendedorNombre: usuario.nombre,
      tipo,
      monto,
      moneda,
      comprobanteUrl: comprobanteUrl.trim(),
      tipoMembresia: MEMBRESIA_LABEL[tipoMembresiaKey],
      tipoMembresiaKey,
      liveMeses: lead.liveMeses,
      notas: texto.trim(),
    });
    setMonto(0);
    setComprobanteUrl("");
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
        <button onClick={cargar} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white">
          Reintentar
        </button>
      </div>
    );
  }
  if (!lead) return <p className="py-8 text-center text-sm text-muted">Lead no encontrado (id: {id}).</p>;

  const vencSinergetico = aFecha(lead.vencimientoSinergetico);
  const vencLive = aFecha(lead.vencimientoLive);
  const estadoSinergetico = estadoDesdeVencimiento(vencSinergetico);
  const estadoLive = estadoDesdeVencimiento(vencLive);
  const inactivo = estadoSinergetico === "VENCIDO" || estadoLive === "VENCIDO";

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
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-deep text-base font-semibold text-white">
                {lead.nombre.trim().charAt(0).toUpperCase()}
              </span>
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
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {inactivo && (
                <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-medium text-danger">
                  Requiere seguimiento
                </span>
              )}
              {lead.noContactar && (
                <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-muted">
                  No quiere ser contactado
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-1 rounded-2xl bg-surface-2 p-1">
            {TABS.map(({ valor, label, icon: Icon }) => (
              <button
                key={valor}
                onClick={() => setTab(valor)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium transition-all duration-500 ease-spring ${
                  tab === valor ? "bg-surface text-primary shadow-[0_6px_16px_-6px_rgba(10,92,255,0.35)]" : "text-muted"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
                {label}
              </button>
            ))}
          </div>

          {tab === "RESUMEN" && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-surface-2 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">
                    {MEMBRESIA_LABEL.SINERGETICO}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-foreground">
                      Vence {vencSinergetico?.toLocaleDateString("es-MX") ?? "—"}
                    </span>
                    <StatusBadge estado={estadoSinergetico} />
                  </div>
                </div>
                <div className="rounded-2xl bg-surface-2 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">{MEMBRESIA_LABEL.LIVE}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-foreground">
                      {vencLive ? `Vence ${vencLive.toLocaleDateString("es-MX")}` : "Nunca comprada"}
                    </span>
                    <StatusBadge estado={estadoLive} />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setAccionAbierta("PAGO")}
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
                  {(accionAbierta === "PAGO" || accionAbierta === "ABONO") && (
                    <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted">
                          Monto {accionAbierta === "PAGO" ? "pagado" : "del abono"}
                        </span>
                        <input
                          type="number"
                          min={1}
                          value={monto || ""}
                          onChange={(e) => setMonto(parseFloat(e.target.value) || 0)}
                          className="rounded-xl border border-silver-deep/60 bg-surface px-4 py-2.5 text-sm outline-none"
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted">Moneda</span>
                        <select
                          value={moneda}
                          onChange={(e) => setMoneda(e.target.value as Moneda)}
                          className="rounded-xl border border-silver-deep/60 bg-surface px-4 py-2.5 text-sm outline-none"
                        >
                          <option value={MONEDAS.MXN}>MXN</option>
                          <option value={MONEDAS.USD}>USD</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-2 sm:col-span-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted">
                          Enlace del comprobante
                        </span>
                        <input
                          type="url"
                          placeholder="https://…"
                          value={comprobanteUrl}
                          onChange={(e) => setComprobanteUrl(e.target.value)}
                          className="rounded-xl border border-silver-deep/60 bg-surface px-4 py-2.5 text-sm outline-none"
                        />
                      </label>
                    </div>
                  )}
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted">
                      {accionAbierta === "NOTA" ? "Nota" : "Notas (opcional)"}
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
                      onClick={() =>
                        accionAbierta === "NOTA" ? enviarNota() : enviarSolicitud(accionAbierta)
                      }
                      disabled={
                        enviando ||
                        (accionAbierta !== "NOTA" && (monto <= 0 || !comprobanteUrl.trim()))
                      }
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {accionAbierta === "NOTA" ? "Guardar nota" : "Enviar a autorización"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === "SEGUIMIENTO" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl bg-surface-2 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">Estado de la llamada</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-foreground">
                    {lead.llamada ? LLAMADA_LABEL[lead.llamada] : "Sin registrar"}
                  </span>
                  {lead.llamada && (
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${LLAMADA_ESTILO[lead.llamada]}`}
                    >
                      {LLAMADA_LABEL[lead.llamada]}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.values(ESTADOS_LLAMADA).map((estado) => (
                  <button
                    key={estado}
                    onClick={() => marcarLlamada(estado)}
                    disabled={enviando}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-50 ${
                      lead.llamada === estado
                        ? LLAMADA_ESTILO[estado]
                        : "border-silver-deep/60 bg-surface-2 text-muted hover:text-foreground"
                    }`}
                  >
                    {LLAMADA_LABEL[estado]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "ACTIVIDAD" && (
            <div className="flex flex-col gap-3">
              {notas.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">Sin actividad registrada.</p>
              ) : (
                <div className="flex flex-col divide-y divide-silver/60">
                  {notas.map((n) => (
                    <div key={n.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{ACCION_LABEL[n.tipo]}</span>
                        <span className="text-xs text-muted">{aFecha(n.creadoEn)?.toLocaleString("es-MX")}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted">{n.texto}</p>
                      <p className="mt-1 text-xs text-muted">por {n.autorNombre}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
