/**
 * El sheet origen cambia de formato de fecha a partir de la fila de datos 1784:
 * filas 1-1783 usan d/m/a; de la 1784 en adelante usan m/d/a y a veces incluyen
 * hora ("10/21/23 10:58AM"). Confirmado manualmente contra el CSV real.
 */
const FILA_CAMBIO_FORMATO = 1784;

export function parsearFechaInscripcion(valor: string, filaDatos: number): Date | null {
  const limpio = valor.trim();
  if (!limpio) return null;

  const [fechaParte] = limpio.split(/\s+/); // descarta la hora si viene incluida
  const partes = fechaParte.split("/").map((p) => parseInt(p, 10));
  if (partes.length !== 3 || partes.some((p) => Number.isNaN(p))) return null;

  let [a, b, anio] = partes;
  if (anio < 100) anio += 2000;

  // d/m/a antes del cambio de formato, m/d/a después.
  const [dia, mes] = filaDatos < FILA_CAMBIO_FORMATO ? [a, b] : [b, a];

  const fecha = new Date(anio, mes - 1, dia);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}
