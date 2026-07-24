import {
  collection,
  doc,
  query,
  orderBy,
  getDocs,
  updateDoc,
  addDoc,
  increment,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { Lead, NotaLead, SheetLead, LeadOverlay } from "./types";
import { ACCIONES_LEAD, ACCION_LABEL, LLAMADA_LABEL, AccionLead, EstadoLlamada, Moneda } from "./constants";
import { obtenerLeadsDelSheet } from "./sheetService";
import {
  obtenerOverlays,
  obtenerOverlay,
  asegurarOverlay,
  limpiarCacheOverlays,
  OVERLAY_VACIO,
} from "./overlayService";
import { aFecha, vencimientoSinergetico, vencimientoLive } from "./membership";

const NOTAS = "notas";
const PAGE_SIZE = 30;

export type FiltroMembresia = "TODOS" | "SINERGETICO" | "LIVE";
export type FiltroEstado = "TODOS" | "ACTIVO" | "VENCIDO";

export type FiltrosLeads = {
  membresia: FiltroMembresia;
  estado: FiltroEstado;
  vendedorId?: string | null;
  soloSinAsignar?: boolean;
  vencidoDesde?: Date | null;
  vencidoHasta?: Date | null;
  pagina?: number;
};

function combinarLead(s: SheetLead, o: LeadOverlay): Lead {
  const overrideSiner = aFecha(o.vencimientoSinergeticoOverride ?? null);
  const overrideLive = aFecha(o.vencimientoLiveOverride ?? null);
  return {
    ...s,
    vencimientoSinergetico:
      overrideSiner && overrideSiner > s.vencimientoSinergetico ? overrideSiner : s.vencimientoSinergetico,
    vencimientoLive:
      overrideLive && (!s.vencimientoLive || overrideLive > s.vencimientoLive) ? overrideLive : s.vencimientoLive,
    vendedorId: o.vendedorId ?? null,
    noContactar: o.noContactar ?? false,
    llamada: o.llamada ?? null,
    apartado: o.apartado ?? false,
    totalAbonado: o.totalAbonado ?? 0,
    productoActualId: o.productoActualId ?? null,
    productoActualNombre: o.productoActualNombre ?? null,
    productoActualPrecio: o.productoActualPrecio ?? null,
  };
}

function combinarConOverlay(sheetLeads: SheetLead[], overlays: Map<string, LeadOverlay>): Lead[] {
  return sheetLeads.map((s) => combinarLead(s, overlays.get(s.id) ?? OVERLAY_VACIO));
}

/**
 * Filtra/busca/pagina en memoria a partir del sheet (cacheado) + overlay de
 * Firestore (cacheado). Sin queries de Firestore por página: todo el costo
 * ya se pagó al cargar ambas cachés una vez.
 */
export async function listarLeads(filtros: FiltrosLeads) {
  const [sheetLeads, overlays] = await Promise.all([obtenerLeadsDelSheet(), obtenerOverlays()]);
  let leads: Lead[] = combinarConOverlay(sheetLeads, overlays);

  if (filtros.membresia === "LIVE") {
    // liveMeses != null cubre a quien ya la traía del sheet; vencimientoLive
    // != null también incluye a quien la ganó por una renovación aprobada
    // (toda renovación da 1 año de Live, aunque nunca la hubiera comprado).
    leads = leads.filter((l) => l.liveMeses != null || l.vencimientoLive != null);
  }

  if (filtros.soloSinAsignar) {
    leads = leads.filter((l) => !l.vendedorId);
  } else if (filtros.vendedorId) {
    leads = leads.filter((l) => l.vendedorId === filtros.vendedorId);
  }

  const ahora = new Date();
  const campoVencimiento = filtros.membresia === "LIVE" ? "vencimientoLive" : "vencimientoSinergetico";

  if (filtros.estado === "VENCIDO") {
    leads = leads.filter((l) => {
      const v = l[campoVencimiento];
      if (!v) return false;
      if (v >= ahora) return false;
      if (filtros.vencidoDesde && v < filtros.vencidoDesde) return false;
      if (filtros.vencidoHasta && v > filtros.vencidoHasta) return false;
      return true;
    });
  } else if (filtros.estado === "ACTIVO") {
    leads = leads.filter((l) => {
      const v = l[campoVencimiento];
      return v ? v >= ahora : false;
    });
  }

  leads.sort((a, b) => {
    // Los apartados (con abono dado) siempre van arriba, sin importar el orden por vencimiento.
    if (a.apartado !== b.apartado) return a.apartado ? -1 : 1;

    const va = (a[campoVencimiento] ?? new Date(0)).getTime();
    const vb = (b[campoVencimiento] ?? new Date(0)).getTime();

    if (filtros.estado === "ACTIVO") return va - vb;
    if (filtros.estado === "VENCIDO") return vb - va;

    // Sin filtro de estado (pestaña "Todos"): primero los vencidos, más
    // antiguos primero; luego los activos, los que vencen más pronto primero.
    const ahoraMs = ahora.getTime();
    const aVencido = va < ahoraMs;
    const bVencido = vb < ahoraMs;
    if (aVencido !== bVencido) return aVencido ? -1 : 1;
    return va - vb;
  });

  const pagina = filtros.pagina ?? 0;
  const inicio = pagina * PAGE_SIZE;
  const pageItems = leads.slice(inicio, inicio + PAGE_SIZE);

  return { leads: pageItems, hayMas: leads.length > inicio + PAGE_SIZE, total: leads.length };
}

/** Búsqueda por correo, teléfono (últimos dígitos) o nombre — todo en memoria. */
export async function buscarLeads(termino: string): Promise<Lead[]> {
  const valor = termino.trim().toLowerCase();
  if (!valor) return [];

  const [sheetLeads, overlays] = await Promise.all([obtenerLeadsDelSheet(), obtenerOverlays()]);
  const leads = combinarConOverlay(sheetLeads, overlays);

  const soloDigitos = valor.replace(/\D/g, "");
  const porTelefono = soloDigitos.length >= 7;

  return leads
    .filter((l) => {
      if (l.correo?.toLowerCase().includes(valor)) return true;
      if (l.nombre.toLowerCase().includes(valor)) return true;
      if (porTelefono && l.telefono?.replace(/\D/g, "").includes(soloDigitos)) return true;
      return false;
    })
    .slice(0, 30);
}

export async function obtenerLead(id: string): Promise<Lead | null> {
  const [sheetLeads, overlay] = await Promise.all([obtenerLeadsDelSheet(), obtenerOverlay(id)]);
  const base = sheetLeads.find((l) => l.id === id);
  if (!base) return null;
  return combinarLead(base, overlay ?? OVERLAY_VACIO);
}

export async function listarNotasLead(leadId: string): Promise<NotaLead[]> {
  const snap = await getDocs(query(collection(db, "leads", leadId, NOTAS), orderBy("creadoEn", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NotaLead);
}

export async function registrarAccionLead(params: {
  leadId: string;
  autorId: string;
  autorNombre: string;
  tipo: AccionLead;
  texto: string;
  monto?: number;
}) {
  const ref = await asegurarOverlay(params.leadId);

  await addDoc(collection(db, "leads", params.leadId, NOTAS), {
    leadId: params.leadId,
    autorId: params.autorId,
    autorNombre: params.autorNombre,
    tipo: params.tipo,
    texto: params.texto,
    monto: params.monto ?? null,
    creadoEn: Timestamp.now(),
  });

  if (params.tipo === ACCIONES_LEAD.NO_CONTACTAR) {
    await updateDoc(ref, { noContactar: true, actualizadoEn: Timestamp.now() });
  }
  // "Pagó/Renovó" ya no recalcula fechas: el sheet sigue siendo la fuente de
  // verdad de la fecha de inscripción; la renovación se refleja allá.
}

export async function actualizarLlamada(
  leadId: string,
  estado: EstadoLlamada,
  autorId: string,
  autorNombre: string
) {
  const ref = await asegurarOverlay(leadId);
  await updateDoc(ref, { llamada: estado, actualizadoEn: Timestamp.now() });
  await addDoc(collection(db, "leads", leadId, NOTAS), {
    leadId,
    autorId,
    autorNombre,
    tipo: ACCIONES_LEAD.LLAMADA,
    texto: `${ACCION_LABEL.LLAMADA}: ${LLAMADA_LABEL[estado]}`,
    monto: null,
    creadoEn: Timestamp.now(),
  });
}

/**
 * El abono NO pasa por autorización del admin: se guarda directo en la
 * línea de tiempo del lead y lo marca como "apartado" para que resalte
 * arriba de la lista del vendedor. Se puede dar más de un abono por lead;
 * todos quedan registrados y se van sumando a totalAbonado.
 */
export async function registrarAbono(params: {
  leadId: string;
  autorId: string;
  autorNombre: string;
  monto: number;
  moneda: Moneda;
  comprobanteUrl: string;
  notas?: string;
  productoId: string;
  productoNombre: string;
  productoPrecio: number;
}) {
  const ref = await asegurarOverlay(params.leadId);
  const overlayActual = (await obtenerOverlay(params.leadId)) ?? OVERLAY_VACIO;

  await addDoc(collection(db, "leads", params.leadId, NOTAS), {
    leadId: params.leadId,
    autorId: params.autorId,
    autorNombre: params.autorNombre,
    tipo: ACCIONES_LEAD.ABONO,
    texto:
      params.notas?.trim() ||
      `${ACCION_LABEL.ABONO} de ${params.monto} ${params.moneda} (${params.productoNombre})`,
    monto: params.monto,
    moneda: params.moneda,
    comprobanteUrl: params.comprobanteUrl,
    productoId: params.productoId,
    productoNombre: params.productoNombre,
    creadoEn: Timestamp.now(),
  });

  // Si es un producto distinto al que se venía abonando, el progreso arranca de nuevo.
  const mismoProducto = overlayActual.productoActualId === params.productoId;
  await updateDoc(ref, {
    apartado: true,
    totalAbonado: mismoProducto ? increment(params.monto) : params.monto,
    productoActualId: params.productoId,
    productoActualNombre: params.productoNombre,
    productoActualPrecio: params.productoPrecio,
    actualizadoEn: Timestamp.now(),
  });
  limpiarCacheOverlays();
}

/**
 * Se llama al aprobar un "Pago/Renovación": toda renovación da 1 año de
 * Club Sinergético y 1 año de Club Sinergético Live, sin importar cuál de
 * las dos tenía el lead antes. Extiende el vencimiento efectivo sin tocar
 * el sheet (overlay en Firestore).
 */
export async function aplicarRenovacionManual(leadId: string) {
  const ref = await asegurarOverlay(leadId);
  const ahora = new Date();
  await updateDoc(ref, {
    vencimientoSinergeticoOverride: Timestamp.fromDate(vencimientoSinergetico(ahora)),
    vencimientoLiveOverride: Timestamp.fromDate(vencimientoLive(ahora, 12)),
    actualizadoEn: Timestamp.now(),
  });
  limpiarCacheOverlays();
}

/**
 * Deshace un abono ya guardado (reembolso o error de captura): NO borra la
 * nota original (queda marcada como deshecha, con quién y por qué, para que
 * el registro se conserve) y le resta el monto al progreso. Solo tiene
 * sentido tocar el progreso si ese abono era del producto actual del lead —
 * si ya se venía siguiendo otro producto, solo se marca la nota.
 */
export async function deshacerAbono(
  leadId: string,
  nota: NotaLead,
  motivo: string,
  autorId: string,
  autorNombre: string
) {
  const ref = await asegurarOverlay(leadId);
  const overlayActual = (await obtenerOverlay(leadId)) ?? OVERLAY_VACIO;

  await updateDoc(doc(db, "leads", leadId, NOTAS, nota.id), {
    deshecho: true,
    deshechoPorId: autorId,
    deshechoPorNombre: autorNombre,
    deshechoMotivo: motivo.trim(),
    deshechoEn: Timestamp.now(),
  });

  const mismoProducto = overlayActual.productoActualId === nota.productoId;
  if (mismoProducto) {
    const nuevoTotal = (overlayActual.totalAbonado ?? 0) - (nota.monto ?? 0);
    if (nuevoTotal <= 0) {
      await updateDoc(ref, {
        apartado: false,
        totalAbonado: 0,
        productoActualId: null,
        productoActualNombre: null,
        productoActualPrecio: null,
        actualizadoEn: Timestamp.now(),
      });
    } else {
      await updateDoc(ref, { totalAbonado: increment(-(nota.monto ?? 0)), actualizadoEn: Timestamp.now() });
    }
  }

  await addDoc(collection(db, "leads", leadId, NOTAS), {
    leadId,
    autorId,
    autorNombre,
    tipo: ACCIONES_LEAD.NOTA,
    texto: `Abono de ${nota.monto} ${nota.moneda} deshecho (${nota.productoNombre ?? "producto eliminado"}): ${motivo.trim()}`,
    creadoEn: Timestamp.now(),
  });

  limpiarCacheOverlays();
}

/**
 * Ajuste manual: resta una cantidad cualquiera del progreso del apartado
 * (por ejemplo cuando un abono viejo no se pudo descontar solo al deshacerse
 * porque no tenía guardado a qué producto pertenecía). Pide motivo siempre y
 * queda registrado en Actividad.
 */
export async function restarAbono(
  leadId: string,
  monto: number,
  motivo: string,
  autorId: string,
  autorNombre: string
) {
  const ref = await asegurarOverlay(leadId);
  const overlayActual = (await obtenerOverlay(leadId)) ?? OVERLAY_VACIO;
  const nuevoTotal = (overlayActual.totalAbonado ?? 0) - monto;

  if (nuevoTotal <= 0) {
    await updateDoc(ref, {
      apartado: false,
      totalAbonado: 0,
      productoActualId: null,
      productoActualNombre: null,
      productoActualPrecio: null,
      actualizadoEn: Timestamp.now(),
    });
  } else {
    await updateDoc(ref, { totalAbonado: nuevoTotal, actualizadoEn: Timestamp.now() });
  }

  await addDoc(collection(db, "leads", leadId, NOTAS), {
    leadId,
    autorId,
    autorNombre,
    tipo: ACCIONES_LEAD.AJUSTE,
    texto: `Se restaron ${monto} del abono acumulado: ${motivo.trim()}`,
    monto,
    creadoEn: Timestamp.now(),
  });

  limpiarCacheOverlays();
}

export async function limpiarApartado(leadId: string) {
  const ref = await asegurarOverlay(leadId);
  await updateDoc(ref, {
    apartado: false,
    totalAbonado: 0,
    productoActualId: null,
    productoActualNombre: null,
    productoActualPrecio: null,
    actualizadoEn: Timestamp.now(),
  });
  limpiarCacheOverlays();
}

export async function asignarLeadsEnLote(
  leadIds: string[],
  asignaciones: { vendedorId: string; cantidad: number }[]
) {
  const batch = writeBatch(db);
  let cursor = 0;
  for (const { vendedorId, cantidad } of asignaciones) {
    const asignados = leadIds.slice(cursor, cursor + cantidad);
    cursor += cantidad;
    for (const leadId of asignados) {
      batch.set(
        doc(db, "leads", leadId),
        { vendedorId, noContactar: false, actualizadoEn: Timestamp.now() },
        { merge: true }
      );
    }
  }
  await batch.commit();
  limpiarCacheOverlays();
  return cursor;
}

export async function reasignarLead(leadId: string, vendedorId: string | null) {
  const ref = doc(db, "leads", leadId);
  await updateDoc(ref, { vendedorId, actualizadoEn: Timestamp.now() }).catch(async () => {
    // el overlay puede no existir todavía si el lead nunca se había tocado
    await asegurarOverlay(leadId);
    await updateDoc(ref, { vendedorId, actualizadoEn: Timestamp.now() });
  });
}
