import { Timestamp } from "firebase/firestore";
import { ESTADOS_LEAD, EstadoLead, SINERGETICO_DIAS } from "./constants";

export function aFecha(valor: Timestamp | Date | string | null | undefined): Date | null {
  if (!valor) return null;
  if (valor instanceof Timestamp) return valor.toDate();
  if (valor instanceof Date) return valor;
  const parsed = new Date(valor);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Vencimiento del Club Sinergético (anual): fecha de inscripción + 365 días. */
export function vencimientoSinergetico(fechaInscripcion: Date): Date {
  const vencimiento = new Date(fechaInscripcion);
  vencimiento.setDate(vencimiento.getDate() + SINERGETICO_DIAS);
  return vencimiento;
}

/** Vencimiento del Club Sinergético Live: fecha de inscripción + N meses (columna J del sheet). */
export function vencimientoLive(fechaInscripcion: Date, meses: number): Date {
  const vencimiento = new Date(fechaInscripcion);
  vencimiento.setMonth(vencimiento.getMonth() + meses);
  return vencimiento;
}

export function estadoDesdeVencimiento(vencimiento: Date | null): EstadoLead {
  if (!vencimiento) return ESTADOS_LEAD.SIN_MEMBRESIA;
  return new Date() <= vencimiento ? ESTADOS_LEAD.ACTIVO : ESTADOS_LEAD.VENCIDO;
}

export function diasRestantes(vencimiento: Date | null): number | null {
  if (!vencimiento) return null;
  const ms = vencimiento.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function formatoUnidad(dias: number): string {
  if (dias < 30) return `${dias} día${dias === 1 ? "" : "s"}`;
  if (dias < 365) {
    const meses = Math.round(dias / 30);
    return `${meses} mes${meses === 1 ? "" : "es"}`;
  }
  const anios = Math.round(dias / 365);
  return `${anios} año${anios === 1 ? "" : "s"}`;
}

/** "Vence el 5/1/2026 · en 12 días" o "Venció el 5/1/2023 · hace 2 años". */
export function textoVencimiento(vencimiento: Date | null): string {
  if (!vencimiento) return "Sin membresía";
  const fechaTexto = vencimiento.toLocaleDateString("es-MX");
  const dias = diasRestantes(vencimiento);
  if (dias === null) return `Vence ${fechaTexto}`;
  if (dias >= 0) return `Vence ${fechaTexto} · en ${formatoUnidad(Math.max(1, dias))}`;
  return `Venció ${fechaTexto} · hace ${formatoUnidad(Math.abs(dias))}`;
}

export type EstadoMembresias = {
  sinergetico: { vencimiento: Date; estado: EstadoLead };
  live: { vencimiento: Date; estado: EstadoLead; meses: number } | { vencimiento: null; estado: "SIN_MEMBRESIA"; meses: null };
};

/**
 * Calcula el estado de ambas membresías a partir de datos crudos del lead.
 * No confía en fechas de vencimiento guardadas en el sheet origen (se detectaron
 * filas corruptas); siempre recalcula desde fechaInscripcion.
 */
export function calcularEstadoMembresias(
  fechaInscripcion: Date,
  liveMeses: number | null
): EstadoMembresias {
  const vencSinergetico = vencimientoSinergetico(fechaInscripcion);
  const sinergetico = {
    vencimiento: vencSinergetico,
    estado: estadoDesdeVencimiento(vencSinergetico),
  };

  if (!liveMeses) {
    return { sinergetico, live: { vencimiento: null, estado: ESTADOS_LEAD.SIN_MEMBRESIA, meses: null } };
  }

  const vencLive = vencimientoLive(fechaInscripcion, liveMeses);
  return {
    sinergetico,
    live: { vencimiento: vencLive, estado: estadoDesdeVencimiento(vencLive), meses: liveMeses },
  };
}
