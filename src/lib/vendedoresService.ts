import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { initializeApp, deleteApp, getApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { db, app as mainApp } from "./firebase";
import { Usuario } from "./types";
import { Rol } from "./constants";

const USUARIOS = "usuarios";

/**
 * Crea el usuario en Firebase Auth + su perfil en Firestore. Usa una app
 * secundaria de Firebase solo para este alta: createUserWithEmailAndPassword
 * inicia sesión automáticamente con el usuario nuevo, y esto evita que eso
 * reemplace la sesión del admin que está dando de alta al vendedor.
 */
export async function crearUsuario(datos: { nombre: string; correo: string; clave: string; rol: Rol }) {
  const nombreApp = "alta-usuario-temporal";
  const appTemp = getApps().some((a) => a.name === nombreApp)
    ? getApp(nombreApp)
    : initializeApp(mainApp.options, nombreApp);
  const authTemp = getAuth(appTemp);

  const credencial = await createUserWithEmailAndPassword(authTemp, datos.correo, datos.clave);
  await crearPerfilUsuario(credencial.user.uid, {
    nombre: datos.nombre,
    correo: datos.correo,
    rol: datos.rol,
  });
  await signOut(authTemp);
  await deleteApp(appTemp);
  return credencial.user.uid;
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const snap = await getDocs(query(collection(db, USUARIOS), orderBy("nombre", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Usuario);
}

export async function listarVendedoresActivos(): Promise<Usuario[]> {
  const snap = await getDocs(
    query(
      collection(db, USUARIOS),
      where("rol", "in", ["VENDEDOR", "COORDINADOR"]),
      where("activo", "==", true)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Usuario);
}

/** Da de alta el perfil (rol, nombre) de un usuario ya creado en Firebase Auth. */
export async function crearPerfilUsuario(uid: string, datos: { nombre: string; correo: string; rol: Rol }) {
  await setDoc(doc(db, USUARIOS, uid), {
    ...datos,
    activo: true,
    creadoEn: Timestamp.now(),
  });
}

export async function actualizarRol(uid: string, rol: Rol) {
  await updateDoc(doc(db, USUARIOS, uid), { rol });
}

export async function activarDesactivarUsuario(uid: string, activo: boolean) {
  await updateDoc(doc(db, USUARIOS, uid), { activo });
}

export async function actualizarComision(uid: string, comisionPorTipo: Record<string, number>) {
  await updateDoc(doc(db, USUARIOS, uid), { comisionPorTipo });
}
