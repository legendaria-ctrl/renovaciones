import { collection, doc, getDocs, query, orderBy, addDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { Producto } from "./types";

const PRODUCTOS = "productos";

let cache: Producto[] | null = null;

export async function listarProductos(forzar = false): Promise<Producto[]> {
  if (cache && !forzar) return cache;
  const snap = await getDocs(query(collection(db, PRODUCTOS), orderBy("creadoEn", "desc")));
  cache = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Producto);
  return cache;
}

export async function listarProductosActivos(): Promise<Producto[]> {
  return (await listarProductos()).filter((p) => p.activo);
}

export async function crearProducto(datos: { nombre: string; precioTotal: number; comisionPorVenta: number }) {
  await addDoc(collection(db, PRODUCTOS), { ...datos, activo: true, creadoEn: Timestamp.now() });
  cache = null;
}

export async function actualizarProducto(
  id: string,
  datos: Partial<Pick<Producto, "nombre" | "precioTotal" | "comisionPorVenta" | "activo">>
) {
  await updateDoc(doc(db, PRODUCTOS, id), datos);
  cache = null;
}
