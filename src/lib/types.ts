import { Timestamp } from "firebase/firestore";
import { AccionLead, EstadoSolicitud, Rol } from "./constants";

export type Lead = {
  id: string;
  numeroSheet: number; // columna # del sheet origen, usado para el import incremental
  nombre: string;
  nombreLower: string;
  correo: string | null;
  telefono: string | null;
  telefonoClave: string | null; // últimos 10 dígitos, para búsqueda/identidad
  pais: string | null;
  ciudad: string | null;
  fechaInscripcion: Timestamp;
  liveMeses: number | null; // columna J: 3, 6 o 12; null si nunca compró Live
  vencimientoSinergetico: Timestamp; // fechaInscripcion + 1 año, fijo desde el import
  vencimientoLive: Timestamp | null; // fechaInscripcion + liveMeses, fijo desde el import
  vendedorId: string | null;
  noContactar: boolean;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
};

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

export type ImportState = {
  ultimoNumeroSheet: number;
  actualizadoEn: Timestamp;
};
