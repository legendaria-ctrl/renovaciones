import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getCountFromServer,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { SolicitudAbono } from "./types";
import { ESTADOS_SOLICITUD, ACCIONES_LEAD, TIPOS_SOLICITUD, TipoMembresia, Moneda } from "./constants";
import { registrarAccionLead, aplicarRenovacionManual, limpiarApartado } from "./leadsService";

const PENDIENTES = "solicitudesAbono";

export async function crearSolicitud(datos: {
  leadId: string;
  leadNombre: string;
  vendedorId: string;
  vendedorNombre: string;
  tipo: "PAGO" | "ABONO";
  monto: number;
  moneda: Moneda;
  comprobanteUrl: string;
  tipoMembresia: string;
  tipoMembresiaKey: TipoMembresia;
  liveMeses: number | null;
  productoId: string | null;
  productoNombre: string | null;
  productoComision: number | null;
  notas: string;
}) {
  await addDoc(collection(db, PENDIENTES), {
    ...datos,
    estado: ESTADOS_SOLICITUD.PENDIENTE,
    creadoEn: Timestamp.now(),
  });
}

export async function listarPendientes(): Promise<SolicitudAbono[]> {
  const snap = await getDocs(
    query(
      collection(db, PENDIENTES),
      where("estado", "==", ESTADOS_SOLICITUD.PENDIENTE),
      orderBy("creadoEn", "asc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SolicitudAbono);
}

/** Solo para la burbuja del sidebar: cuenta sin traer los documentos completos. */
export async function contarPendientes(): Promise<number> {
  const snap = await getCountFromServer(
    query(collection(db, PENDIENTES), where("estado", "==", ESTADOS_SOLICITUD.PENDIENTE))
  );
  return snap.data().count;
}

/**
 * Ventas autorizadas (pagos aprobados) — la base del reporte de comisiones.
 * Un solo "where" (sin combinar con orderBy en otro campo) para no depender
 * de un índice compuesto en Firestore; el filtro por tipo y el orden se
 * hacen en memoria, la colección es chica.
 */
export async function listarVentasAprobadas(): Promise<SolicitudAbono[]> {
  const snap = await getDocs(query(collection(db, PENDIENTES), where("estado", "==", ESTADOS_SOLICITUD.APROBADO)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as SolicitudAbono)
    .filter((s) => s.tipo === TIPOS_SOLICITUD.PAGO)
    .sort((a, b) => (b.resueltoEn?.toMillis() ?? 0) - (a.resueltoEn?.toMillis() ?? 0));
}

export async function resolverSolicitud(
  solicitud: SolicitudAbono,
  aprobar: boolean,
  resolutorId: string,
  resolutorNombre: string
) {
  await updateDoc(doc(db, PENDIENTES, solicitud.id), {
    estado: aprobar ? ESTADOS_SOLICITUD.APROBADO : ESTADOS_SOLICITUD.RECHAZADO,
    resueltoPorId: resolutorId,
    resueltoPorNombre: resolutorNombre,
    resueltoEn: Timestamp.now(),
  });

  const esPago = solicitud.tipo === TIPOS_SOLICITUD.PAGO;

  if (aprobar && esPago) {
    await aplicarRenovacionManual(solicitud.leadId);
    // Ya se pagó completo: deja de estar "apartado" con progreso pendiente.
    await limpiarApartado(solicitud.leadId);
  }

  await registrarAccionLead({
    leadId: solicitud.leadId,
    autorId: resolutorId,
    autorNombre: resolutorNombre,
    tipo: aprobar ? ACCIONES_LEAD.APROBACION : ACCIONES_LEAD.RECHAZO,
    texto: aprobar
      ? `${esPago ? "Pago" : "Abono"} de ${solicitud.monto} ${solicitud.moneda} aprobado (${solicitud.tipoMembresia})`
      : `${esPago ? "Pago" : "Abono"} de ${solicitud.monto} ${solicitud.moneda} rechazado (${solicitud.tipoMembresia})`,
    monto: solicitud.monto,
  });
}
