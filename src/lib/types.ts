import { Timestamp } from "firebase/firestore";
import { AccionLead, EstadoSolicitud, Rol } from "./constants";

/** Datos del lead tal como vienen del sheet (fuente de verdad, nunca se copian a Firestore). */
export type SheetLead = {
  id: string; // clave de identidad: correo o últimos 10 dígitos del teléfono
  numeroSheet: number | null;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  pais: string | null;
  ciudad: string | null;
  fechaInscripcion: Date;
  liveMeses: number | null; // columna J: 3, 6 o 12; null si nunca compró Live
  vencimientoSinergetico: Date; // fechaInscripcion + 1 año
  vencimientoLive: Date | null; // fechaInscripcion + liveMeses
};

/** Lo único que vive en Firestore por lead: solo existe si alguien lo tocó. */
export type LeadOverlay = {
  vendedorId: string | null;
  noContactar: boolean;
  creadoEn?: Timestamp;
  actualizadoEn?: Timestamp;
};

/** Lead combinado para la UI: datos del sheet + overlay de Firestore (si existe). */
export type Lead = SheetLead & LeadOverlay;

export type NotaLead = {
  id: string;
  leadId: string;
  autorId: string;
  autorNombre: string;
  tipo: AccionLead;
  texto: string;
  monto?: number;
  creadoEn: Timestamp;
};

export type Usuario = {
  id: string; // ver vendedoresService.idPara: prefijo de rol + nombre normalizado
  nombre: string;
  rol: Rol;
  estado: EstadoSolicitud;
  comisionPorTipo?: Record<string, number>;
  creadoEn: Timestamp;
  decididoPor?: string | null;
  decididoEn?: Timestamp | null;
};

export type SolicitudAbono = {
  id: string;
  leadId: string;
  leadNombre: string;
  vendedorId: string;
  vendedorNombre: string;
  monto: number;
  tipoMembresia: string;
  notas: string;
  estado: EstadoSolicitud;
  creadoEn: Timestamp;
  resueltoPorId?: string;
  resueltoPorNombre?: string;
  resueltoEn?: Timestamp;
};
