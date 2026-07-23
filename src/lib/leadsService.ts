import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { Lead, NotaLead } from "./types";
import { ACCIONES_LEAD, AccionLead } from "./constants";
import { vencimientoSinergetico, vencimientoLive } from "./membership";
import { LIVE_MESES_VALIDOS } from "./constants";

const LEADS = "leads";
const NOTAS = "notas";

export type FiltroMembresia = "TODOS" | "SINERGETICO" | "LIVE";
export type FiltroEstado = "TODOS" | "ACTIVO" | "VENCIDO";

export type FiltrosLeads = {
  membresia: FiltroMembresia;
  estado: FiltroEstado;
  vendedorId?: string | null;
  soloSinAsignar?: boolean;
  vencidoDesde?: Date | null; // filtro "vencidos desde tal fecha hasta tal fecha"
  vencidoHasta?: Date | null;
};

const PAGE_SIZE = 30;

/**
 * Trae una página de leads según filtros. Usa los campos precalculados
 * vencimientoSinergetico/vencimientoLive (fijos desde el import) para poder
 * filtrar por vencido/activo con un where de rango, sin tener que recalcular
 * ni releer todo el dataset en cada carga.
 */
export async function listarLeads(
  filtros: FiltrosLeads,
  cursor?: QueryDocumentSnapshot<DocumentData> | null
) {
  const campoVencimiento =
    filtros.membresia === "LIVE" ? "vencimientoLive" : "vencimientoSinergetico";

  const clauses = [] as ReturnType<typeof where>[];

  if (filtros.membresia === "LIVE") {
    // "in" en vez de un rango: Firestore solo permite filtros de rango (<, <=, >, >=)
    // sobre un único campo por consulta, y ya usamos uno para el vencimiento.
    clauses.push(where("liveMeses", "in", LIVE_MESES_VALIDOS));
  }

  if (filtros.vendedorId) {
    clauses.push(where("vendedorId", "==", filtros.vendedorId));
  }
  if (filtros.soloSinAsignar) {
    clauses.push(where("vendedorId", "==", null));
  }

  const ahora = Timestamp.now();
  if (filtros.estado === "VENCIDO") {
    clauses.push(where(campoVencimiento, "<=", filtros.vencidoHasta ? Timestamp.fromDate(filtros.vencidoHasta) : ahora));
    if (filtros.vencidoDesde) {
      clauses.push(where(campoVencimiento, ">=", Timestamp.fromDate(filtros.vencidoDesde)));
    }
  } else if (filtros.estado === "ACTIVO") {
    clauses.push(where(campoVencimiento, ">", ahora));
  }

  const base = query(
    collection(db, LEADS),
    ...clauses,
    orderBy(campoVencimiento, filtros.estado === "ACTIVO" ? "asc" : "desc"),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(PAGE_SIZE)
  );

  const snap = await getDocs(base);
  return {
    leads: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Lead),
    cursor: snap.docs.at(-1) ?? null,
    hayMas: snap.docs.length === PAGE_SIZE,
  };
}

/** Búsqueda puntual por correo exacto, teléfono (últimos 10 dígitos) o prefijo de nombre. */
export async function buscarLeads(termino: string): Promise<Lead[]> {
  const valor = termino.trim();
  if (!valor) return [];

  if (valor.includes("@")) {
    const snap = await getDocs(query(collection(db, LEADS), where("correo", "==", valor.toLowerCase()), limit(20)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Lead);
  }

  const soloDigitos = valor.replace(/\D/g, "");
  if (soloDigitos.length >= 7) {
    const clave = soloDigitos.slice(-10);
    const snap = await getDocs(query(collection(db, LEADS), where("telefonoClave", "==", clave), limit(20)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Lead);
  }

  const prefijo = valor.toLowerCase();
  const snap = await getDocs(
    query(
      collection(db, LEADS),
      orderBy("nombreLower"),
      where("nombreLower", ">=", prefijo),
      where("nombreLower", "<", prefijo + ""),
      limit(20)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Lead);
}

export async function obtenerLead(id: string): Promise<Lead | null> {
  const snap = await getDoc(doc(db, LEADS, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Lead) : null;
}

export async function listarNotasLead(leadId: string): Promise<NotaLead[]> {
  const snap = await getDocs(
    query(collection(db, LEADS, leadId, NOTAS), orderBy("creadoEn", "desc"))
  );
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
  await addDoc(collection(db, LEADS, params.leadId, NOTAS), {
    leadId: params.leadId,
    autorId: params.autorId,
    autorNombre: params.autorNombre,
    tipo: params.tipo,
    texto: params.texto,
    monto: params.monto ?? null,
    creadoEn: Timestamp.now(),
  });

  if (params.tipo === ACCIONES_LEAD.NO_CONTACTAR) {
    await updateDoc(doc(db, LEADS, params.leadId), {
      noContactar: true,
      actualizadoEn: Timestamp.now(),
    });
  }

  if (params.tipo === ACCIONES_LEAD.PAGO) {
    // Renovación confirmada: recalcula vencimientos desde hoy.
    const lead = await obtenerLead(params.leadId);
    if (lead) {
      const hoy = new Date();
      await updateDoc(doc(db, LEADS, params.leadId), {
        fechaInscripcion: Timestamp.fromDate(hoy),
        vencimientoSinergetico: Timestamp.fromDate(vencimientoSinergetico(hoy)),
        vencimientoLive: lead.liveMeses
          ? Timestamp.fromDate(vencimientoLive(hoy, lead.liveMeses))
          : null,
        actualizadoEn: Timestamp.now(),
      });
    }
  }
}

/** Reparte leadIds entre vendedorIds según cantidadPorVendedor, en un solo batch. */
export async function asignarLeadsEnLote(
  leadIds: string[],
  vendedorIds: string[],
  cantidadPorVendedor: number
) {
  const batch = writeBatch(db);
  let cursor = 0;
  for (const vendedorId of vendedorIds) {
    const asignados = leadIds.slice(cursor, cursor + cantidadPorVendedor);
    cursor += cantidadPorVendedor;
    for (const leadId of asignados) {
      batch.update(doc(db, LEADS, leadId), {
        vendedorId,
        actualizadoEn: Timestamp.now(),
      });
    }
  }
  await batch.commit();
  return cursor; // total de leads efectivamente asignados
}

export async function reasignarLead(leadId: string, vendedorId: string | null) {
  await updateDoc(doc(db, LEADS, leadId), {
    vendedorId,
    actualizadoEn: Timestamp.now(),
  });
}
