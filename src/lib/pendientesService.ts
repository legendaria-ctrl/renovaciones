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
import { ESTADOS_SOLICITUD, ACCIONES_LEAD } from "./constants";
import { registrarAccionLead } from "./leadsService";

const PENDIENTES = "solicitudesAbono";

export async function crearSolicitudAbono(datos: {
  leadId: string;
  leadNombre: string;
  vendedorId: string;
  vendedorNombre: string;
  monto: number;
  tipoMembresia: string;
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

  await registrarAccionLead({
    leadId: solicitud.leadId,
    autorId: resolutorId,
    autorNombre: resolutorNombre,
    tipo: aprobar ? ACCIONES_LEAD.APROBACION : ACCIONES_LEAD.RECHAZO,
    texto: aprobar
      ? `Abono de ${solicitud.monto} aprobado (${solicitud.tipoMembresia})`
      : `Abono de ${solicitud.monto} rechazado (${solicitud.tipoMembresia})`,
    monto: solicitud.monto,
  });
}
