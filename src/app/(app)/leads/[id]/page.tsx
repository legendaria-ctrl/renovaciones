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
  Undo2,
} from "lucide-react";
import {
  obtenerLead,
  listarNotasLead,
  registrarAccionLead,
  actualizarLlamada,
  registrarAbono,
  deshacerAbono,
  restarAbono,
} from "@/lib/leadsService";
import { crearSolicitud } from "@/lib/pendientesService";
import { listarProductosActivos } from "@/lib/productosService";
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
import { Lead, NotaLead, Producto } from "@/lib/types";
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
  const [accionError, setAccionError] = useState<string | null>(null);
  const [deshaciendoId, setDeshaciendoId] = useState<string | null>(null);
  const [notaADeshacer, setNotaADeshacer] = useState<NotaLead | null>(null);
  const [motivoDeshacer, setMotivoDeshacer] = useState("");
  const [ajusteAbierto, setAjusteAbierto] = useState(false);
  const [montoAjuste, setMontoAjuste] = useState(0);
  const [motivoAjuste, setMotivoAjuste] = useState("");
  const [enviandoAjuste, setEnviandoAjuste] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productoId, setProductoId] = useState("");

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

  useEffect(() => {
    listarProductosActivos().then(setProductos);
  }, []);

  const productoSeleccionado = productos.find((p) => p.id === productoId) ?? null;

  function abrirAccion(tipo: "PAGO" | "ABONO" | "NOTA") {
    setAccionAbierta(tipo);
    setAccionError(null);
    setMonto(0);
    setProductoId("");
    setComprobanteUrl("");
    setTexto("");
  }

  function elegirProducto(pid: string) {
    setProductoId(pid);
    const p = productos.find((x) => x.id === pid);
    if (p) setMoneda(p.moneda);
    if (accionAbierta === "PAGO") {
      setMonto(p?.precioTotal ?? 0);
    }
  }

  async function registrarSimple(tipo: "NO_CONTACTAR") {
    if (!usuario || !lead) return;
    setEnviando(true);
    setAccionError(null);
    try {
      await registrarAccionLead({
        leadId: lead.id,
        autorId: usuario.id,
        autorNombre: usuario.nombre,
        tipo: ACCIONES_LEAD[tipo],
        texto: ACCION_LABEL[ACCIONES_LEAD[tipo]],
      });
      await cargar();
    } catch (err) {
      setAccionError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setEnviando(false);
    }
  }

  async function marcarLlamada(estado: EstadoLlamada) {
    if (!usuario || !lead) return;
    setEnviando(true);
    setAccionError(null);
    try {
      await actualizarLlamada(lead.id, estado, usuario.id, usuario.nombre);
      await cargar();
    } catch (err) {
      setAccionError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setEnviando(false);
    }
  }

  async function enviarNota() {
    if (!usuario || !lead || !texto.trim()) return;
    setEnviando(true);
    setAccionError(null);
    try {
      await registrarAccionLead({
        leadId: lead.id,
        autorId: usuario.id,
        autorNombre: usuario.nombre,
        tipo: ACCIONES_LEAD.NOTA,
        texto: texto.trim(),
      });
      setTexto("");
      setAccionAbierta(null);
      await cargar();
    } catch (err) {
      setAccionError(err instanceof Error ? err.message : "No se pudo guardar la nota.");
    } finally {
      setEnviando(false);
    }
  }

  /** Pago/Renovación: requiere autorización del admin/coordinador antes de reflejarse. */
  async function enviarPago() {
    if (!usuario || !lead || monto <= 0 || !comprobanteUrl.trim() || !productoSeleccionado) return;
    setEnviando(true);
    setAccionError(null);
    try {
      const tipoMembresiaKey = lead.liveMeses ? TIPOS_MEMBRESIA.LIVE : TIPOS_MEMBRESIA.SINERGETICO;
      await crearSolicitud({
        leadId: lead.id,
        leadNombre: lead.nombre,
        vendedorId: usuario.id,
        vendedorNombre: usuario.nombre,
        tipo: "PAGO",
        monto,
        moneda,
        comprobanteUrl: comprobanteUrl.trim(),
        tipoMembresia: "Club Sinergético + Club Sinergético Live (1 año)",
        tipoMembresiaKey,
        liveMeses: lead.liveMeses,
        productoId: productoSeleccionado.id,
        productoNombre: productoSeleccionado.nombre,
        productoComision: productoSeleccionado.comisionPorVenta,
        productoMoneda: productoSeleccionado.moneda,
        productoComisionMoneda: productoSeleccionado.comisionMoneda,
        notas: texto.trim(),
      });
      setAccionAbierta(null);
      refrescarPendientes();
      await cargar();
    } catch (err) {
      setAccionError(err instanceof Error ? err.message : "No se pudo enviar el pago a autorización.");
    } finally {
      setEnviando(false);
    }
  }

  /** El abono no necesita autorización: se guarda directo y marca al lead como apartado. */
  async function enviarAbono() {
    if (!usuario || !lead || monto <= 0 || !comprobanteUrl.trim() || !productoSeleccionado) return;
    setEnviando(true);
    setAccionError(null);
    try {
      await registrarAbono({
        leadId: lead.id,
        autorId: usuario.id,
        autorNombre: usuario.nombre,
        monto,
        moneda,
        comprobanteUrl: comprobanteUrl.trim(),
        notas: texto.trim(),
        productoId: productoSeleccionado.id,
        productoNombre: productoSeleccionado.nombre,
        productoPrecio: productoSeleccionado.precioTotal,
      });
      setAccionAbierta(null);
      await cargar();
    } catch (err) {
      setAccionError(err instanceof Error ? err.message : "No se pudo guardar el abono.");
    } finally {
      setEnviando(false);
    }
  }

  function abrirDeshacer(nota: NotaLead) {
    setNotaADeshacer(nota);
    setMotivoDeshacer("");
    setAccionError(null);
  }

  async function confirmarDeshacer() {
    if (!usuario || !lead || !notaADeshacer || !motivoDeshacer.trim()) return;
    setDeshaciendoId(notaADeshacer.id);
    setAccionError(null);
    try {
      await deshacerAbono(lead.id, notaADeshacer, motivoDeshacer.trim(), usuario.id, usuario.nombre);
      setNotaADeshacer(null);
      await cargar();
    } catch (err) {
      setAccionError(err instanceof Error ? err.message : "No se pudo deshacer el abono.");
    } finally {
      setDeshaciendoId(null);
    }
  }

  async function confirmarAjuste() {
    if (!usuario || !lead || montoAjuste <= 0 || !motivoAjuste.trim()) return;
    setEnviandoAjuste(true);
    setAccionError(null);
    try {
      await restarAbono(lead.id, montoAjuste, motivoAjuste.trim(), usuario.id, usuario.nombre);
      setAjusteAbierto(false);
      setMontoAjuste(0);
      setMotivoAjuste("");
      await cargar();
    } catch (err) {
      setAccionError(err instanceof Error ? err.message : "No se pudo aplicar el ajuste.");
    } finally {
      setEnviandoAjuste(false);
    }
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
  const progresoAbono =
    lead.apartado && lead.productoActualPrecio
      ? Math.min(100, Math.round(((lead.totalAbonado ?? 0) / lead.productoActualPrecio) * 100))
      : null;
  const faltante =
    lead.apartado && lead.productoActualPrecio ? Math.max(0, lead.productoActualPrecio - (lead.totalAbonado ?? 0)) : null;

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
              {lead.apartado && (
                <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
                  Apartado{lead.productoActualNombre ? ` · ${lead.productoActualNombre}` : ""}
                </span>
              )}
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

              {progresoAbono !== null && (
                <div className="rounded-2xl bg-warning/5 p-4">
                  <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted">
                    <span>Progreso del apartado · {lead.productoActualNombre}</span>
                    <span>{progresoAbono}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-warning transition-all duration-500"
                      style={{ width: `${progresoAbono}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-foreground">
                      ${(lead.totalAbonado ?? 0).toLocaleString("es-MX")} de $
                      {lead.productoActualPrecio?.toLocaleString("es-MX")}
                    </span>
                    <span className="font-medium text-warning">Faltan ${faltante?.toLocaleString("es-MX")}</span>
                  </div>

                  {!ajusteAbierto ? (
                    <button
                      onClick={() => {
                        setAjusteAbierto(true);
                        setMontoAjuste(0);
                        setMotivoAjuste("");
                        setAccionError(null);
                      }}
                      className="mt-3 flex items-center gap-1.5 text-xs font-medium text-danger hover:underline"
                    >
                      <Undo2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Restar del abono
                    </button>
                  ) : (
                    <div className="mt-3 flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
                      {accionError && <p className="text-xs text-danger">{accionError}</p>}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium uppercase tracking-wider text-muted">
                            Cantidad a restar
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={lead.totalAbonado ?? undefined}
                            value={montoAjuste || ""}
                            onChange={(e) => setMontoAjuste(parseFloat(e.target.value) || 0)}
                            className="rounded-xl border border-silver-deep/60 bg-surface px-3 py-2 text-sm outline-none"
                          />
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium uppercase tracking-wider text-muted">Motivo</span>
                          <input
                            value={motivoAjuste}
                            onChange={(e) => setMotivoAjuste(e.target.value)}
                            placeholder="Ej. Reembolso parcial"
                            className="rounded-xl border border-silver-deep/60 bg-surface px-3 py-2 text-sm outline-none"
                          />
                        </label>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setAjusteAbierto(false)}
                          className="rounded-xl px-3 py-2 text-sm font-medium text-muted"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={confirmarAjuste}
                          disabled={montoAjuste <= 0 || !motivoAjuste.trim() || enviandoAjuste}
                          className="rounded-xl bg-danger px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                          {enviandoAjuste ? "Guardando…" : "Confirmar"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => abrirAccion("PAGO")}
                  disabled={enviando}
                  className="flex items-center gap-2 rounded-xl bg-success/10 px-4 py-2.5 text-sm font-medium text-success transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-50"
                >
                  <CircleDollarSign className="h-4 w-4" strokeWidth={1.75} />
                  Pagó / Renovó
                </button>
                <button
                  onClick={() => abrirAccion("ABONO")}
                  disabled={enviando}
                  className="flex items-center gap-2 rounded-xl bg-warning/10 px-4 py-2.5 text-sm font-medium text-warning transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-50"
                >
                  <HandCoins className="h-4 w-4" strokeWidth={1.75} />
                  Dio abono
                </button>
                <button
                  onClick={() => abrirAccion("NOTA")}
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
                  {accionError && (
                    <div className="mb-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{accionError}</div>
                  )}
                  {(accionAbierta === "PAGO" || accionAbierta === "ABONO") && (
                    <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-2 sm:col-span-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted">Producto</span>
                        <select
                          value={productoId}
                          onChange={(e) => elegirProducto(e.target.value)}
                          className="rounded-xl border border-silver-deep/60 bg-surface px-4 py-2.5 text-sm outline-none"
                        >
                          <option value="">Selecciona un producto…</option>
                          {productos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} · ${p.precioTotal.toLocaleString("es-MX")} {p.moneda}
                              {p.comisionMoneda !== p.moneda
                                ? ` (comisión en ${p.comisionMoneda})`
                                : ""}
                            </option>
                          ))}
                        </select>
                        {productos.length === 0 && (
                          <span className="text-xs text-danger">
                            No hay productos activos — pídele a un admin que cree uno en Comisiones.
                          </span>
                        )}
                        {accionAbierta === "ABONO" && productoSeleccionado && (
                          <span className="text-xs text-muted">
                            {lead.productoActualId === productoSeleccionado.id
                              ? `Ya lleva $${(lead.totalAbonado ?? 0).toLocaleString("es-MX")} de $${productoSeleccionado.precioTotal.toLocaleString("es-MX")}`
                              : "Este abono empieza un progreso nuevo para este producto."}
                          </span>
                        )}
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted">
                          Monto {accionAbierta === "PAGO" ? "pagado" : "del abono"}
                        </span>
                        <input
                          type="number"
                          min={1}
                          readOnly={accionAbierta === "PAGO"}
                          value={monto || ""}
                          onChange={(e) => setMonto(parseFloat(e.target.value) || 0)}
                          className={`rounded-xl border border-silver-deep/60 px-4 py-2.5 text-sm outline-none ${
                            accionAbierta === "PAGO" ? "bg-surface-2 text-muted" : "bg-surface"
                          }`}
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
                      onClick={() => {
                        if (accionAbierta === "NOTA") enviarNota();
                        else if (accionAbierta === "PAGO") enviarPago();
                        else enviarAbono();
                      }}
                      disabled={
                        enviando ||
                        (accionAbierta !== "NOTA" && (monto <= 0 || !comprobanteUrl.trim() || !productoId))
                      }
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {accionAbierta === "NOTA"
                        ? "Guardar nota"
                        : accionAbierta === "PAGO"
                        ? "Enviar a autorización"
                        : "Guardar abono"}
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
              {accionError && (
                <div className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{accionError}</div>
              )}
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
                      <p className={`mt-1 text-sm ${n.deshecho ? "text-muted line-through" : "text-muted"}`}>
                        {n.texto}
                      </p>
                      {n.comprobanteUrl && (
                        <a
                          href={n.comprobanteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs text-primary hover:underline"
                        >
                          Ver comprobante
                        </a>
                      )}
                      {n.deshecho && (
                        <p className="mt-1 text-xs text-danger">
                          Deshecho por {n.deshechoPorNombre} · {n.deshechoMotivo}
                        </p>
                      )}
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-xs text-muted">por {n.autorNombre}</p>
                        {n.tipo === ACCIONES_LEAD.ABONO && !n.deshecho && (
                          <button
                            onClick={() => abrirDeshacer(n)}
                            disabled={deshaciendoId === n.id}
                            className="flex items-center gap-1 text-xs font-medium text-danger hover:underline disabled:opacity-50"
                          >
                            <Undo2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                            Deshacer
                          </button>
                        )}
                      </div>
                      {notaADeshacer?.id === n.id && (
                        <div className="mt-2 flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
                          <span className="text-xs font-medium uppercase tracking-wider text-muted">
                            Motivo para deshacer este abono
                          </span>
                          <textarea
                            value={motivoDeshacer}
                            onChange={(e) => setMotivoDeshacer(e.target.value)}
                            rows={2}
                            placeholder="Ej. Se reembolsó, se capturó por error…"
                            className="rounded-xl border border-silver-deep/60 bg-surface px-3 py-2 text-sm outline-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setNotaADeshacer(null)}
                              className="rounded-xl px-3 py-2 text-sm font-medium text-muted"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={confirmarDeshacer}
                              disabled={!motivoDeshacer.trim() || deshaciendoId === n.id}
                              className="rounded-xl bg-danger px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                            >
                              {deshaciendoId === n.id ? "Deshaciendo…" : "Confirmar"}
                            </button>
                          </div>
                        </div>
                      )}
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
