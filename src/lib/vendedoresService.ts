import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { ESTADOS_SOLICITUD, EstadoSolicitud, ROLES, Rol } from "./constants";
import { Usuario } from "./types";

const USUARIOS = "usuarios";
const usuariosRef = collection(db, USUARIOS);

const MARCAS_DIACRITICAS = /[̀-ͯ]/g;

export function normalizarNombre(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(MARCAS_DIACRITICAS, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

const PREFIJO_ROL: Record<Rol, string> = {
  VENDEDOR: "vendedor",
  COORDINADOR: "coordinador",
  ADMIN: "admin",
};

// Prefijado por rol para que el mismo nombre pueda pedir accesos distintos
// sin chocar (ej. alguien que es Vendedor y luego pide también Admin).
export function idPara(nombre: string, rol: Rol): string {
  const base = normalizarNombre(nombre);
  return base ? `${PREFIJO_ROL[rol]}-${base}` : "";
}

async function existeAdminAprobado(): Promise<boolean> {
  const snap = await getDocs(
    query(usuariosRef, where("rol", "==", ROLES.ADMIN), where("estado", "==", ESTADOS_SOLICITUD.APROBADO), limit(1))
  );
  return !snap.empty;
}

/**
 * Se llama en cada intento de login. Si es la primera vez que ese nombre
 * pide ese rol, crea la solicitud en PENDIENTE — salvo que sea el primer
 * Admin del sistema, que se aprueba solo para no dejar la plataforma sin
 * nadie que apruebe al resto. Devuelve el estado actual.
 */
export async function verificarOCrearSolicitud(nombre: string, rol: Rol): Promise<EstadoSolicitud> {
  const id = idPara(nombre, rol);
  if (!id) return ESTADOS_SOLICITUD.PENDIENTE;

  const ref = doc(db, USUARIOS, id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const esPrimerAdmin = rol === ROLES.ADMIN && !(await existeAdminAprobado());
    const estadoInicial = esPrimerAdmin ? ESTADOS_SOLICITUD.APROBADO : ESTADOS_SOLICITUD.PENDIENTE;

    await setDoc(ref, {
      nombre: nombre.trim(),
      rol,
      estado: estadoInicial,
      comisionPorTipo: {},
      creadoEn: serverTimestamp(),
      decididoPor: esPrimerAdmin ? nombre.trim() : null,
      decididoEn: esPrimerAdmin ? serverTimestamp() : null,
    });
    return estadoInicial;
  }

  return (snap.data().estado as EstadoSolicitud) ?? ESTADOS_SOLICITUD.PENDIENTE;
}

/** Alta directa por un admin/coordinador, ya aprobada, sin esperar el primer login. */
export async function crearUsuarioAprobado(nombre: string, rol: Rol, decididoPor: string): Promise<void> {
  const limpio = nombre.trim();
  const id = idPara(limpio, rol);
  if (!id) throw new Error("El nombre no es válido.");

  const ref = doc(db, USUARIOS, id);
  const existente = await getDoc(ref);
  if (existente.exists()) {
    throw new Error("Ya existe alguien con ese nombre y ese rol.");
  }

  await setDoc(ref, {
    nombre: limpio,
    rol,
    estado: ESTADOS_SOLICITUD.APROBADO,
    comisionPorTipo: {},
    creadoEn: serverTimestamp(),
    decididoPor,
    decididoEn: serverTimestamp(),
  });
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const snap = await getDocs(query(usuariosRef, orderBy("creadoEn", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Usuario);
}

export async function listarVendedoresActivos(): Promise<Usuario[]> {
  const snap = await getDocs(
    query(
      usuariosRef,
      where("rol", "in", [ROLES.VENDEDOR, ROLES.COORDINADOR]),
      where("estado", "==", ESTADOS_SOLICITUD.APROBADO)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Usuario);
}

/** Igual que listarVendedoresActivos pero incluye Admins (para reportes de comisiones, por si venden). */
export async function listarVendedoresYAdminsActivos(): Promise<Usuario[]> {
  const snap = await getDocs(
    query(
      usuariosRef,
      where("rol", "in", [ROLES.VENDEDOR, ROLES.COORDINADOR, ROLES.ADMIN]),
      where("estado", "==", ESTADOS_SOLICITUD.APROBADO)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Usuario);
}

export async function decidirSolicitud(id: string, estado: "APROBADO" | "RECHAZADO", decididoPor: string) {
  await updateDoc(doc(db, USUARIOS, id), { estado, decididoPor, decididoEn: serverTimestamp() });
}

/**
 * El id del usuario está armado con nombre+rol (para el login), así que
 * editar cualquiera de los dos implica mover el documento a un id nuevo
 * en vez de solo actualizar campos.
 */
export async function editarUsuario(
  usuario: Usuario,
  nuevoNombre: string,
  nuevoRol: Rol,
  decididoPor: string
): Promise<void> {
  const limpio = nuevoNombre.trim();
  const nuevoId = idPara(limpio, nuevoRol);
  if (!nuevoId) throw new Error("El nombre no es válido.");

  if (nuevoId === usuario.id) {
    await updateDoc(doc(db, USUARIOS, usuario.id), { nombre: limpio });
    return;
  }

  const refNuevo = doc(db, USUARIOS, nuevoId);
  if ((await getDoc(refNuevo)).exists()) {
    throw new Error("Ya existe alguien con ese nombre y ese rol.");
  }

  await setDoc(refNuevo, {
    nombre: limpio,
    rol: nuevoRol,
    estado: usuario.estado,
    comisionPorTipo: usuario.comisionPorTipo ?? {},
    creadoEn: usuario.creadoEn ?? serverTimestamp(),
    decididoPor,
    decididoEn: serverTimestamp(),
  });
  await deleteDoc(doc(db, USUARIOS, usuario.id));
}

/** Alta en lote: crea los que no existan todavía y omite los que ya están. */
export async function crearUsuariosEnLote(nombres: string[], rol: Rol, decididoPor: string): Promise<number> {
  let creados = 0;
  for (const nombre of nombres) {
    try {
      await crearUsuarioAprobado(nombre, rol, decididoPor);
      creados += 1;
    } catch {
      // ya existía con ese nombre y rol, se omite
    }
  }
  return creados;
}

export async function actualizarComision(id: string, comisionPorTipo: Record<string, number>) {
  await updateDoc(doc(db, USUARIOS, id), { comisionPorTipo });
}

export async function obtenerEstadoUsuario(id: string): Promise<EstadoSolicitud | null> {
  const snap = await getDoc(doc(db, USUARIOS, id));
  return snap.exists() ? ((snap.data().estado as EstadoSolicitud) ?? null) : null;
}

export type { Timestamp };
