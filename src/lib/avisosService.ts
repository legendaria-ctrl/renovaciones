import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { Rol } from "./constants";

export type AudienciaAviso = "TODOS" | "PRIVADO";

export type Aviso = {
  id: string;
  audiencia: AudienciaAviso;
  destinatarios: string[]; // nombres, solo aplica si audiencia === "PRIVADO"
  mensaje: string;
  autorId: string;
  autorNombre: string;
  autorRol: Rol;
  creadoEn: Timestamp;
  leidoPor: string[]; // nombres
};

const AVISOS = "avisos";
const avisosRef = collection(db, AVISOS);

function esRelevante(a: Aviso, sesion: { id: string; nombre: string }): boolean {
  // Un aviso nunca aparece en la bandeja de quien lo envió.
  if (a.autorId === sesion.id) return false;
  if (a.audiencia === "TODOS") return true;
  return a.destinatarios.includes(sesion.nombre);
}

/**
 * Sin listener en tiempo real (a propósito, para no gastar cuota de lecturas
 * de Firestore): se llama al entrar y luego con un polling ligero desde el
 * componente que lo use. Trae los últimos 100 avisos y filtra en memoria
 * los que le tocan a esta sesión.
 */
export async function listarAvisosRelevantes(sesion: { id: string; nombre: string }): Promise<Aviso[]> {
  const snap = await getDocs(query(avisosRef, orderBy("creadoEn", "desc"), limit(100)));
  const todos = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Aviso);
  return todos.filter((a) => esRelevante(a, sesion));
}

/** Para la pantalla de administración: todos los avisos enviados, sin filtrar. */
export async function listarAvisosEnviados(): Promise<Aviso[]> {
  const snap = await getDocs(query(avisosRef, orderBy("creadoEn", "desc"), limit(100)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Aviso);
}

export async function crearAviso(
  autor: { id: string; nombre: string; rol: Rol },
  audiencia: AudienciaAviso,
  destinatarios: string[],
  mensaje: string
) {
  const limpio = mensaje.trim();
  if (!limpio) return;

  await addDoc(avisosRef, {
    audiencia,
    destinatarios: audiencia === "PRIVADO" ? destinatarios : [],
    mensaje: limpio,
    autorId: autor.id,
    autorNombre: autor.nombre,
    autorRol: autor.rol,
    creadoEn: Timestamp.now(),
    leidoPor: [],
  });
}

export async function marcarAvisoLeido(id: string, leidoPor: string[], nombre: string) {
  if (leidoPor.includes(nombre)) return;
  await updateDoc(doc(db, AVISOS, id), { leidoPor: arrayUnion(nombre) });
}
