import { Timestamp } from "firebase/firestore";
import { AccionLead, EstadoLlamada, EstadoSolicitud, Moneda, Rol, TipoMembresia, TipoSolicitud } from "./constants";

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
  llamada: EstadoLlamada | null;
  // Vencimiento efectivo tras un pago aprobado. El sheet sigue siendo la
  // fuente de verdad para el historial, pero no se reescribe desde la app;
  // esta es la forma de reflejar una renovación sin tocarlo.
  vencimientoSinergeticoOverride?: Timestamp | null;
  vencimientoLiveOverride?: Timestamp | null;
  // El abono no pasa por autorización: se guarda directo y marca al lead
  // como apartado para que resalte arriba de la lista del vendedor. Se
  // acumula hacia el producto que se esté abonando actualmente; si se
  // abona hacia un producto distinto, el total arranca de nuevo.
  apartado?: boolean;
  totalAbonado?: number;
  productoActualId?: string | null;
  productoActualNombre?: string | null;
  productoActualPrecio?: number | null;
  creadoEn?: Timestamp;
  actualizadoEn?: Timestamp;
};

/** Producto vendible: precio total y comisión fija que gana el vendedor por cada venta. */
export type Producto = {
  id: string;
  nombre: string;
  precioTotal: number;
  moneda: Moneda;
  comisionPorVenta: number;
  activo: boolean;
  creadoEn: Timestamp;
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
  moneda?: Moneda;
  comprobanteUrl?: string;
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
  tipo: TipoSolicitud;
  monto: number;
  moneda: Moneda;
  comprobanteUrl: string;
  tipoMembresia: string; // etiqueta para mostrar
  tipoMembresiaKey: TipoMembresia; // para recalcular el vencimiento al aprobar
  liveMeses: number | null;
  productoId: string | null;
  productoNombre: string | null;
  productoComision: number | null; // snapshot al momento de la venta
  productoMoneda: Moneda | null;
  notas: string;
  estado: EstadoSolicitud;
  creadoEn: Timestamp;
  resueltoPorId?: string;
  resueltoPorNombre?: string;
  resueltoEn?: Timestamp;
};
