import { doc, getDoc, setDoc, writeBatch, collection, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { parseCsv } from "./csv";
import { parsearFechaInscripcion } from "./fechaSheet";
import { vencimientoSinergetico, vencimientoLive } from "./membership";
import { claveIdentidad, ultimos10Digitos } from "./identidad";

const CONFIG_IMPORT = doc(db, "config", "import");
const LEADS = "leads";
const BATCH_MAX = 400;

// Índices de columna del CSV origen (ver AGENTS/memoria del análisis del sheet).
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
  const m = valor.trim().match(/^(\d+)\s*Meses?$/i);
  return m ? parseInt(m[1], 10) : null;
}

/** null si la celda no trae un número real, para no confundirla con "fila 0" al comparar. */
function parsearNumeroFila(valor: string | undefined): number | null {
  if (!valor) return null;
  const n = parseInt(valor, 10);
  return Number.isNaN(n) ? null : n;
}

export type ResultadoImportacion = {
  nuevos: number;
  ultimoNumeroSheet: number;
  sinCambios: boolean;
};

/**
 * Trae el CSV del sheet, ubica dónde quedó la última importación (por el
 * número de fila "#") y escribe solo las filas nuevas. No relee ni reescribe
 * nada de lo ya importado.
 */
export async function actualizarLeadsNuevos(): Promise<ResultadoImportacion> {
  const res = await fetch("/api/sheet-csv");
  if (!res.ok) throw new Error("No se pudo leer el sheet");
  const texto = await res.text();

  const filas = parseCsv(texto);
  const datos = filas.slice(1); // sin encabezado

  const configSnap = await getDoc(CONFIG_IMPORT);
  // null = "nunca se ha importado nada", distinto de "esta fila no trae número".
  const ultimoConocido: number | null = configSnap.exists()
    ? ((configSnap.data().ultimoNumeroSheet as number) ?? null)
    : null;

  // El último número de fila válido de todo el sheet, buscando desde el final
  // por si las últimas filas tienen la columna "#" vacía o corrupta.
  let ultimoNumeroSheetActual = 0;
  for (let i = datos.length - 1; i >= 0; i--) {
    const numero = parsearNumeroFila(datos[i][COL.numero]);
    if (numero !== null) {
      ultimoNumeroSheetActual = numero;
      break;
    }
  }

  if (ultimoConocido !== null && ultimoNumeroSheetActual === ultimoConocido) {
    return { nuevos: 0, ultimoNumeroSheet: ultimoConocido, sinCambios: true };
  }

  // Sube desde el final hasta encontrar la última fila ya conocida, ignorando
  // filas sin número válido (no cuentan como coincidencia ni cortan la búsqueda).
  let indiceInicio = 0;
  if (ultimoConocido !== null) {
    for (let i = datos.length - 1; i >= 0; i--) {
      const numero = parsearNumeroFila(datos[i][COL.numero]);
      if (numero === ultimoConocido) {
        indiceInicio = i + 1;
        break;
      }
    }
  }

  const nuevasFilas = datos.slice(indiceInicio);

  let batch = writeBatch(db);
  let enBatch = 0;
  let totalNuevos = 0;

  for (let i = 0; i < nuevasFilas.length; i++) {
    const fila = nuevasFilas[i];
    const filaDatos = indiceInicio + i + 1; // 1-based, para elegir formato de fecha

    const numeroSheet = parsearNumeroFila(fila[COL.numero]);
    const nombre = fila[COL.nombre]?.trim();
    if (!nombre) continue;

    const fecha = parsearFechaInscripcion(fila[COL.fechaInscripcion] ?? "", filaDatos);
    if (!fecha) continue;

    const correo = fila[COL.correo]?.trim() || null;
    const telefono = fila[COL.telefono]?.trim() || null;
    const liveMeses = parsearMeses(fila[COL.liveMeses] ?? "");
    const clave = claveIdentidad(correo, telefono);
    if (!clave) continue;

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
    totalNuevos++;

    if (enBatch >= BATCH_MAX) {
      await batch.commit();
      batch = writeBatch(db);
      enBatch = 0;
    }
  }

  if (enBatch > 0) await batch.commit();

  await setDoc(CONFIG_IMPORT, {
    ultimoNumeroSheet: ultimoNumeroSheetActual,
    actualizadoEn: Timestamp.now(),
  });

  return { nuevos: totalNuevos, ultimoNumeroSheet: ultimoNumeroSheetActual, sinCambios: false };
}
