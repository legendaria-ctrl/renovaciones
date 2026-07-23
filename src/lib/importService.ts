import { doc, getDoc, setDoc, writeBatch, collection, Timestamp, WriteBatch } from "firebase/firestore";
import { db } from "./firebase";
import { parsearFechaInscripcion } from "./fechaSheet";
import { vencimientoSinergetico, vencimientoLive } from "./membership";
import { claveIdentidad, ultimos10Digitos } from "./identidad";

const CONFIG_IMPORT = doc(db, "config", "import");
const LEADS = "leads";
const BATCH_MAX = 400;
const TIMEOUT_COMMIT_MS = 20_000;

// Índices de columna del CSV/Sheet origen (ver AGENTS/memoria del análisis del sheet).
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

function parsearMeses(valor: string): number | null {
  const m = (valor || "").trim().match(/^(\d+)\s*Meses?$/i);
  return m ? parseInt(m[1], 10) : null;
}

function parsearNumeroFila(valor: string | undefined): number | null {
  if (!valor) return null;
  const n = parseInt(valor, 10);
  return Number.isNaN(n) ? null : n;
}

/**
 * El SDK de Firestore, al toparse con la cuota diaria agotada
 * (resource-exhausted), a veces se queda reintentando con backoff en vez de
 * rechazar la promesa — el commit() nunca resuelve ni truena. Se envuelve
 * con un timeout propio para no dejar la UI colgada para siempre.
 */
function commitConTimeout(batch: WriteBatch, ms: number): Promise<void> {
  return Promise.race([
    batch.commit(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("TIMEOUT_CUOTA")), ms)),
  ]);
}

function esErrorDeCuota(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("resource-exhausted") || msg === "TIMEOUT_CUOTA";
}

export type ResultadoImportacion = {
  nuevos: number;
  filasProcesadas: number;
  sinCambios: boolean;
  limiteAlcanzado?: boolean;
};

/**
 * Trae las filas del sheet vía la API real de Google Sheets (JSON, no CSV) y
 * escribe solo las filas nuevas desde la última importación. El checkpoint
 * es la CANTIDAD de filas de datos ya procesadas (posición en el arreglo),
 * no el valor de la columna "#" — esa columna puede venir vacía o corrupta
 * en algunas filas del sheet origen, así que nunca se usa como referencia
 * para saber dónde se quedó la importación. El sheet es de solo-inserción al
 * final, igual que asume el CRM hermano que lee este mismo sheet sin
 * problemas.
 */
export async function actualizarLeadsNuevos(): Promise<ResultadoImportacion> {
  const res = await fetch("/api/sheet-values");
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "No se pudo leer el sheet");

  const filas: string[][] = data.values || [];
  const datos = filas.slice(1); // sin encabezado

  const configSnap = await getDoc(CONFIG_IMPORT);
  const filasYaProcesadas: number = configSnap.exists() ? (configSnap.data().filasProcesadas as number) || 0 : 0;

  if (datos.length <= filasYaProcesadas) {
    return { nuevos: 0, filasProcesadas: filasYaProcesadas, sinCambios: true };
  }

  const nuevasFilas = datos.slice(filasYaProcesadas);

  let batch = writeBatch(db);
  let enBatch = 0;
  let totalNuevos = 0;
  let filasConfirmadas = filasYaProcesadas;
  let filasEnLote = filasYaProcesadas;

  async function confirmarLote() {
    await commitConTimeout(batch, TIMEOUT_COMMIT_MS);
    batch = writeBatch(db);
    enBatch = 0;
    filasConfirmadas = filasEnLote;
    await setDoc(CONFIG_IMPORT, {
      filasProcesadas: filasConfirmadas,
      actualizadoEn: Timestamp.now(),
    });
  }

  for (let i = 0; i < nuevasFilas.length; i++) {
    const fila = nuevasFilas[i];
    const filaDatos = filasYaProcesadas + i + 1; // 1-based, para elegir formato de fecha
    filasEnLote = filasYaProcesadas + i + 1;

    const numeroSheet = parsearNumeroFila(fila[COL.numero]);
    const nombre = fila[COL.nombre]?.trim();

    if (nombre) {
      const fecha = parsearFechaInscripcion(fila[COL.fechaInscripcion] ?? "", filaDatos);
      const correo = fila[COL.correo]?.trim() || null;
      const telefono = fila[COL.telefono]?.trim() || null;
      const liveMeses = parsearMeses(fila[COL.liveMeses] ?? "");
      const clave = claveIdentidad(correo, telefono);

      if (fecha && clave) {
        const leadRef = doc(collection(db, LEADS), clave.replace(/[/]/g, "_"));
        batch.set(
          leadRef,
          {
            numeroSheet,
            nombre,
            nombreLower: nombre.toLowerCase(),
            correo,
            telefono,
            telefonoClave: ultimos10Digitos(telefono),
            pais: fila[COL.pais]?.trim() || null,
            ciudad: fila[COL.ciudad]?.trim() || null,
            fechaInscripcion: Timestamp.fromDate(fecha),
            liveMeses,
            vencimientoSinergetico: Timestamp.fromDate(vencimientoSinergetico(fecha)),
            vencimientoLive: liveMeses ? Timestamp.fromDate(vencimientoLive(fecha, liveMeses)) : null,
            vendedorId: null,
            noContactar: false,
            creadoEn: Timestamp.now(),
            actualizadoEn: Timestamp.now(),
          },
          { merge: true }
        );
        enBatch++;
      }
    }

    if (enBatch >= BATCH_MAX) {
      try {
        const pendientes = enBatch;
        await confirmarLote();
        totalNuevos += pendientes;
      } catch (err) {
        if (esErrorDeCuota(err)) {
          return { nuevos: totalNuevos, filasProcesadas: filasConfirmadas, sinCambios: false, limiteAlcanzado: true };
        }
        throw err;
      }
    }
  }

  if (enBatch > 0) {
    try {
      const pendientes = enBatch;
      await confirmarLote();
      totalNuevos += pendientes;
    } catch (err) {
      if (esErrorDeCuota(err)) {
        return { nuevos: totalNuevos, filasProcesadas: filasConfirmadas, sinCambios: false, limiteAlcanzado: true };
      }
      throw err;
    }
  } else if (filasEnLote !== filasConfirmadas) {
    // Últimas filas sin datos válidos para guardar, pero igual hay que
    // avanzar el checkpoint para no releerlas en el siguiente intento.
    await setDoc(CONFIG_IMPORT, { filasProcesadas: filasEnLote, actualizadoEn: Timestamp.now() });
    filasConfirmadas = filasEnLote;
  }

  return { nuevos: totalNuevos, filasProcesadas: filasConfirmadas, sinCambios: false };
}
