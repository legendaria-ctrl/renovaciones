import { collection, doc, getDocs, query, orderBy, addDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { Producto } from "./types";
import { MONEDAS, Moneda } from "./constants";

const PRODUCTOS = "productos";

let cache: Producto[] | null = null;

// Productos creados antes de que existiera la moneda de precio/comisión no
// tienen esos campos en Firestore; se normalizan aquí para que el resto de
// la app (selects, addDoc, etc.) nunca reciba undefined.
function normalizarProducto(id: string, datos: Record<string, unknown>): Producto {
  const producto = { id, ...datos } as Producto;
  return {
    ...producto,
    moneda: producto.moneda ?? MONEDAS.MXN,
    comisionMoneda: producto.comisionMoneda ?? producto.moneda ?? MONEDAS.MXN,
  };
}

export async function listarProductos(forzar = false): Promise<Producto[]> {
  if (cache && !forzar) return cache;
  const snap = await getDocs(query(collection(db, PRODUCTOS), orderBy("creadoEn", "desc")));
  cache = snap.docs.map((d) => normalizarProducto(d.id, d.data()));
  return cache;
}

export async function listarProductosActivos(): Promise<Producto[]> {
  return (await listarProductos()).filter((p) => p.activo);
}

export async function crearProducto(datos: {
  nombre: string;
  precioTotal: number;
  moneda: Moneda;
  comisionPorVenta: number;
  comisionMoneda: Moneda;
}) {
  await addDoc(collection(db, PRODUCTOS), { ...datos, activo: true, creadoEn: Timestamp.now() });
  cache = null;
}

export async function actualizarProducto(
  id: string,
  datos: Partial<
    Pick<Producto, "nombre" | "precioTotal" | "moneda" | "comisionPorVenta" | "comisionMoneda" | "activo">
  >
) {
  await updateDoc(doc(db, PRODUCTOS, id), datos);
  cache = null;
}
