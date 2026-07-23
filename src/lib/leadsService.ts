import { collection, doc, query, orderBy, getDocs, updateDoc, addDoc, Timestamp, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { Lead, NotaLead, SheetLead, LeadOverlay } from "./types";
import { ACCIONES_LEAD, AccionLead } from "./constants";
import { obtenerLeadsDelSheet } from "./sheetService";
import { obtenerOverlays, obtenerOverlay, asegurarOverlay, limpiarCacheOverlays, OVERLAY_VACIO } from "./overlayService";

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

function combinarConOverlay(sheetLeads: SheetLead[], overlays: Map<string, LeadOverlay>): Lead[] {
  return sheetLeads.map((s) => {
    const o = overlays.get(s.id) ?? OVERLAY_VACIO;
    return { ...s, vendedorId: o.vendedorId ?? null, noContactar: o.noContactar ?? false };
  });
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
    leads = leads.filter((l) => l.liveMeses != null);
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
    const va = (a[campoVencimiento] ?? new Date(0)).getTime();
    const vb = (b[campoVencimiento] ?? new Date(0)).getTime();
    return filtros.estado === "ACTIVO" ? va - vb : vb - va;
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
  const o = overlay ?? OVERLAY_VACIO;
  return { ...base, vendedorId: o.vendedorId ?? null, noContactar: o.noContactar ?? false };
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

export async function asignarLeadsEnLote(leadIds: string[], vendedorIds: string[], cantidadPorVendedor: number) {
  const batch = writeBatch(db);
  let cursor = 0;
  for (const vendedorId of vendedorIds) {
    const asignados = leadIds.slice(cursor, cursor + cantidadPorVendedor);
    cursor += cantidadPorVendedor;
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
