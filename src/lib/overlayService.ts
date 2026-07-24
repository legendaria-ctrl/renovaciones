import { collection, doc, getDoc, getDocs, setDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { LeadOverlay } from "./types";

const LEADS = "leads";

let cache: Map<string, LeadOverlay> | null = null;
let cacheEnCurso: Promise<Map<string, LeadOverlay>> | null = null;

/**
 * El overlay solo existe para leads que alguien tocó (asignados, con notas,
 * marcados "no contactar"). Como esa colección es mucho más chica que el
 * sheet completo, se trae entera una sola vez y se cachea en memoria — así
 * se puede cruzar contra los datos del sheet sin tener que hacer una lectura
 * de Firestore por cada lead visible.
 */
export async function obtenerOverlays(forzar = false): Promise<Map<string, LeadOverlay>> {
  if (cache && !forzar) return cache;
  if (cacheEnCurso && !forzar) return cacheEnCurso;

  cacheEnCurso = (async () => {
    const snap = await getDocs(collection(db, LEADS));
    const mapa = new Map<string, LeadOverlay>();
    snap.forEach((d) => mapa.set(d.id, d.data() as LeadOverlay));
    cache = mapa;
    return mapa;
  })();

  try {
    return await cacheEnCurso;
  } finally {
    cacheEnCurso = null;
  }
}

export function limpiarCacheOverlays() {
  cache = null;
}

export async function obtenerOverlay(id: string): Promise<LeadOverlay | null> {
  const snap = await getDoc(doc(db, LEADS, id));
  return snap.exists() ? (snap.data() as LeadOverlay) : null;
}

const OVERLAY_VACIO: LeadOverlay = {
  vendedorId: null,
  noContactar: false,
  llamada: null,
  vencimientoSinergeticoOverride: null,
  vencimientoLiveOverride: null,
};

/** Crea el overlay la primera vez que alguien toca un lead; si ya existe, solo mergea. */
export async function asegurarOverlay(id: string) {
  const ref = doc(db, LEADS, id);
  const actual = await getDoc(ref);
  if (!actual.exists()) {
    await setDoc(ref, { ...OVERLAY_VACIO, creadoEn: Timestamp.now(), actualizadoEn: Timestamp.now() });
  }
  return ref;
}

export { OVERLAY_VACIO };
