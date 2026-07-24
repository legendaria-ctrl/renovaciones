export const ROLES = {
  ADMIN: "ADMIN",
  COORDINADOR: "COORDINADOR",
  VENDEDOR: "VENDEDOR",
} as const;
export type Rol = (typeof ROLES)[keyof typeof ROLES];

export const ROL_LABEL: Record<Rol, string> = {
  ADMIN: "Administrador",
  COORDINADOR: "Coordinador",
  VENDEDOR: "Vendedor",
};

// Un rol puede asignar/reasignar leads y aprobar pendientes si es Coordinador o Admin.
export function puedeAsignar(rol: Rol | undefined | null): boolean {
  return rol === ROLES.ADMIN || rol === ROLES.COORDINADOR;
}

export function puedeAprobar(rol: Rol | undefined | null): boolean {
  return rol === ROLES.ADMIN || rol === ROLES.COORDINADOR;
}

export function esAdmin(rol: Rol | undefined | null): boolean {
  return rol === ROLES.ADMIN;
}

export const TIPOS_MEMBRESIA = {
  SINERGETICO: "SINERGETICO",
  LIVE: "LIVE",
} as const;
export type TipoMembresia = (typeof TIPOS_MEMBRESIA)[keyof typeof TIPOS_MEMBRESIA];

export const MEMBRESIA_LABEL: Record<TipoMembresia, string> = {
  SINERGETICO: "Club Sinergético",
  LIVE: "Club Sinergético Live",
};

// Duración del Club Sinergético (anual): 1 año exacto desde la fecha de inscripción.
export const SINERGETICO_DIAS = 365;

// Duraciones válidas del Club Sinergético Live, en meses (columna J del sheet origen).
export const LIVE_MESES_VALIDOS = [3, 6, 12] as const;

export const ESTADOS_LEAD = {
  ACTIVO: "ACTIVO",
  VENCIDO: "VENCIDO",
  SIN_MEMBRESIA: "SIN_MEMBRESIA",
} as const;
export type EstadoLead = (typeof ESTADOS_LEAD)[keyof typeof ESTADOS_LEAD];

export const ESTADO_LABEL: Record<EstadoLead, string> = {
  ACTIVO: "Activo",
  VENCIDO: "Vencido",
  SIN_MEMBRESIA: "Sin membresía",
};

export const ACCIONES_LEAD = {
  PAGO: "PAGO",
  ABONO: "ABONO",
  NO_CONTACTAR: "NO_CONTACTAR",
  NOTA: "NOTA",
  LLAMADA: "LLAMADA",
  ASIGNACION: "ASIGNACION",
  REASIGNACION: "REASIGNACION",
  IMPORTACION: "IMPORTACION",
  APROBACION: "APROBACION",
  RECHAZO: "RECHAZO",
} as const;
export type AccionLead = (typeof ACCIONES_LEAD)[keyof typeof ACCIONES_LEAD];

export const ACCION_LABEL: Record<AccionLead, string> = {
  PAGO: "Pagó / Renovó",
  ABONO: "Dio abono",
  NO_CONTACTAR: "No quiere ser contactado",
  NOTA: "Nota",
  LLAMADA: "Seguimiento de llamada",
  ASIGNACION: "Lead asignado",
  REASIGNACION: "Lead reasignado",
  IMPORTACION: "Importado del sheet",
  APROBACION: "Abono aprobado",
  RECHAZO: "Abono rechazado",
};

// Estado de seguimiento telefónico del lead, igual que el CRM hermano.
export const ESTADOS_LLAMADA = {
  SI: "SI",
  NO_CONTESTO: "NO_CONTESTO",
  NO: "NO",
  PROGRAMADA: "PROGRAMADA",
} as const;
export type EstadoLlamada = (typeof ESTADOS_LLAMADA)[keyof typeof ESTADOS_LLAMADA];

export const LLAMADA_LABEL: Record<EstadoLlamada, string> = {
  SI: "Contestó",
  NO_CONTESTO: "No contestó",
  NO: "No llamado",
  PROGRAMADA: "Llamada programada",
};

export const ESTADOS_SOLICITUD = {
  PENDIENTE: "PENDIENTE",
  APROBADO: "APROBADO",
  RECHAZADO: "RECHAZADO",
} as const;
export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[keyof typeof ESTADOS_SOLICITUD];

export const TIPOS_SOLICITUD = {
  PAGO: "PAGO",
  ABONO: "ABONO",
} as const;
export type TipoSolicitud = (typeof TIPOS_SOLICITUD)[keyof typeof TIPOS_SOLICITUD];

export const TIPO_SOLICITUD_LABEL: Record<TipoSolicitud, string> = {
  PAGO: "Pago / Renovación",
  ABONO: "Abono",
};

export const MONEDAS = {
  MXN: "MXN",
  USD: "USD",
} as const;
export type Moneda = (typeof MONEDAS)[keyof typeof MONEDAS];
