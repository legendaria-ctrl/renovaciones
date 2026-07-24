import { collectionGroup, getDocs, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { NotaLead } from "./types";
import { ACCIONES_LEAD } from "./constants";

let cacheNotas: NotaLead[] | null = null;

/**
 * Cualquier where()/orderBy() sobre una collectionGroup necesita un índice
 * de grupo de colección explícito habilitado desde la consola de Firebase.
 * Para no depender de eso, se trae la colección completa sin filtros (una
 * consulta sin filtro no requiere índice) y se filtra fecha + tipo en
 * memoria; se cachea en el módulo porque el volumen de notas es chico.
 */
async function obtenerTodasLasNotas(forzar = false): Promise<NotaLead[]> {
  if (cacheNotas && !forzar) return cacheNotas;
  const snap = await getDocs(collectionGroup(db, "notas"));
  cacheNotas = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NotaLead);
  return cacheNotas;
}

/**
 * Actividad de renovación (pagos y abonos aprobados) de todos los vendedores
 * en un rango de fechas, vía collectionGroup sobre las notas de cada lead.
 */
export async function listarActividadRango(desde: Date, hasta: Date): Promise<NotaLead[]> {
  const desdeMs = Timestamp.fromDate(desde).toMillis();
  const hastaMs = Timestamp.fromDate(hasta).toMillis();
  const notas = await obtenerTodasLasNotas();
  return notas
    .filter((n) => n.tipo === ACCIONES_LEAD.PAGO || n.tipo === ACCIONES_LEAD.APROBACION)
    .filter((n) => {
      const ms = n.creadoEn?.toMillis() ?? 0;
      return ms >= desdeMs && ms <= hastaMs;
    })
    .sort((a, b) => (b.creadoEn?.toMillis() ?? 0) - (a.creadoEn?.toMillis() ?? 0));
}

/** Toda la actividad (de cualquier tipo: notas, llamadas, abonos, asignaciones, etc.) en un rango de fecha. */
export async function listarTodaLaActividadRango(desde: Date, hasta: Date): Promise<NotaLead[]> {
  const desdeMs = Timestamp.fromDate(desde).toMillis();
  const hastaMs = Timestamp.fromDate(hasta).toMillis();
  const notas = await obtenerTodasLasNotas();
  return notas
    .filter((n) => {
      const ms = n.creadoEn?.toMillis() ?? 0;
      return ms >= desdeMs && ms <= hastaMs;
    })
    .sort((a, b) => (b.creadoEn?.toMillis() ?? 0) - (a.creadoEn?.toMillis() ?? 0));
}

export type ResumenVendedor = {
  autorId: string;
  autorNombre: string;
  totalMonto: number;
  cantidad: number;
};

export function resumirPorVendedor(actividad: NotaLead[]): ResumenVendedor[] {
  const mapa = new Map<string, ResumenVendedor>();
  for (const n of actividad) {
    const actual = mapa.get(n.autorId) ?? {
      autorId: n.autorId,
      autorNombre: n.autorNombre,
      totalMonto: 0,
      cantidad: 0,
    };
    actual.totalMonto += n.monto ?? 0;
    actual.cantidad += 1;
    mapa.set(n.autorId, actual);
  }
  return Array.from(mapa.values()).sort((a, b) => b.totalMonto - a.totalMonto);
}
