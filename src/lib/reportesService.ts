import { collectionGroup, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { NotaLead } from "./types";
import { ACCIONES_LEAD } from "./constants";

/**
 * Actividad de renovación (pagos y abonos aprobados) de todos los vendedores
 * en un rango de fechas, vía collectionGroup sobre las notas de cada lead.
 * Solo se filtra por fecha en la consulta (rango sobre un único campo, no
 * necesita índice compuesto); el tipo se filtra en memoria.
 */
export async function listarActividadRango(desde: Date, hasta: Date): Promise<NotaLead[]> {
  const snap = await getDocs(
    query(
      collectionGroup(db, "notas"),
      where("creadoEn", ">=", Timestamp.fromDate(desde)),
      where("creadoEn", "<=", Timestamp.fromDate(hasta)),
      orderBy("creadoEn", "desc")
    )
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as NotaLead)
    .filter((n) => n.tipo === ACCIONES_LEAD.PAGO || n.tipo === ACCIONES_LEAD.APROBACION);
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
