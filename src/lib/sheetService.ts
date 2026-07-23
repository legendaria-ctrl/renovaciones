import { parsearFechaInscripcion } from "./fechaSheet";
import { vencimientoSinergetico, vencimientoLive } from "./membership";
import { claveIdentidad } from "./identidad";
import { SheetLead } from "./types";

// Índices de columna del sheet origen (ver memoria del análisis del sheet).
const COL = {
  numero: 0,
  nombre: 1,
  correo: 2,
  pais: 3,
  telefono: 4,
  fechaInscripcion: 5,
  liveMeses: 9, // "Tipo de Membresia": "3 Meses" | "6 Meses" | "12 Meses" | ""
  ciudad: 15,
};

const SESSION_KEY = "renovaciones_sheet_cache_v1";

function parsearMeses(valor: string): number | null {
  const m = (valor || "").trim().match(/^(\d+)\s*Meses?$/i);
  return m ? parseInt(m[1], 10) : null;
}

function parsearNumeroFila(valor: string | undefined): number | null {
  if (!valor) return null;
  const n = parseInt(valor, 10);
  return Number.isNaN(n) ? null : n;
}

let cache: SheetLead[] | null = null;
let cacheEnCurso: Promise<SheetLead[]> | null = null;

function leerCacheSesion(): SheetLead[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as (Omit<SheetLead, "fechaInscripcion" | "vencimientoSinergetico" | "vencimientoLive"> & {
      fechaInscripcion: string;
      vencimientoSinergetico: string;
      vencimientoLive: string | null;
    })[];
    return parsed.map((l) => ({
      ...l,
      fechaInscripcion: new Date(l.fechaInscripcion),
      vencimientoSinergetico: new Date(l.vencimientoSinergetico),
      vencimientoLive: l.vencimientoLive ? new Date(l.vencimientoLive) : null,
    }));
  } catch {
    return null;
  }
}

function guardarCacheSesion(leads: SheetLead[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(leads));
  } catch {
    // sessionStorage lleno o no disponible (modo privado, etc.): no es crítico,
    // simplemente no persiste entre recargas y se vuelve a pedir al sheet.
  }
}

/**
 * Lee el sheet completo vía la API de Google Sheets y lo mantiene en memoria
 * (y en sessionStorage, para no volver a pedir varios MB en cada recarga de
 * página dentro de la misma pestaña). El sheet ES la fuente de verdad para
 * los datos del lead — nunca se copian a Firestore, así se evita por
 * completo la cuota de escritura diaria (20K/día en el plan gratuito) que
 * antes se agotaba al importar los ~23,000 leads de una sola vez.
 */
export async function obtenerLeadsDelSheet(forzar = false): Promise<SheetLead[]> {
  if (cache && !forzar) return cache;

  if (!forzar) {
    const deSesion = leerCacheSesion();
    if (deSesion) {
      cache = deSesion;
      return deSesion;
    }
  }

  if (cacheEnCurso && !forzar) return cacheEnCurso;

  cacheEnCurso = (async () => {
    const res = await fetch("/api/sheet-values");
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "No se pudo leer el sheet");

    const filas: string[][] = data.values || [];
    const datos = filas.slice(1); // sin encabezado
    const leads: SheetLead[] = [];
    const vistos = new Set<string>();

    for (let i = 0; i < datos.length; i++) {
      const fila = datos[i];
      const filaDatos = i + 1; // 1-based, para elegir formato de fecha

      const nombre = fila[COL.nombre]?.trim();
      if (!nombre) continue;

      const fecha = parsearFechaInscripcion(fila[COL.fechaInscripcion] ?? "", filaDatos);
      if (!fecha) continue;

      const correo = fila[COL.correo]?.trim().toLowerCase() || null;
      const telefono = fila[COL.telefono]?.trim() || null;
      const clave = claveIdentidad(correo, telefono);
      if (!clave || vistos.has(clave)) continue; // el sheet a veces repite filas; se queda la primera
      vistos.add(clave);

      const liveMeses = parsearMeses(fila[COL.liveMeses] ?? "");

      leads.push({
        id: clave,
        numeroSheet: parsearNumeroFila(fila[COL.numero]),
        nombre,
        correo,
        telefono,
        pais: fila[COL.pais]?.trim() || null,
        ciudad: fila[COL.ciudad]?.trim() || null,
        fechaInscripcion: fecha,
        liveMeses,
        vencimientoSinergetico: vencimientoSinergetico(fecha),
        vencimientoLive: liveMeses ? vencimientoLive(fecha, liveMeses) : null,
      });
    }

    cache = leads;
    guardarCacheSesion(leads);
    return leads;
  })();

  try {
    return await cacheEnCurso;
  } finally {
    cacheEnCurso = null;
  }
}

export function limpiarCacheSheet() {
  cache = null;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // no crítico
    }
  }
}
