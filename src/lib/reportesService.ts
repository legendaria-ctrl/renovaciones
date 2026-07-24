import { collectionGroup, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { NotaLead } from "./types";
import { ACCIONES_LEAD } from "./constants";

/**
 * Actividad de renovación (pagos y abonos aprobados) de todos los vendedores
 * en un rango de fechas, vía collectionGroup sobre las notas de cada lead.
 * Sin orderBy: en una collectionGroup query, ordenar requiere un índice de
 * grupo de colección explícito (COLLECTION_GROUP_DESC) que no existe en este
 * proyecto; se ordena en memoria en su lugar.
 */
export async function listarActividadRango(desde: Date, hasta: Date): Promise<NotaLead[]> {
  const snap = await getDocs(
    query(
      collectionGroup(db, "notas"),
      where("creadoEn", ">=", Timestamp.fromDate(desde)),
      where("creadoEn", "<=", Timestamp.fromDate(hasta))
    )
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as NotaLead)
    .filter((n) => n.tipo === ACCIONES_LEAD.PAGO || n.tipo === ACCIONES_LEAD.APROBACION)
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
