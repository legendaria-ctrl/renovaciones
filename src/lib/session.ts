import { SignJWT, jwtVerify } from "jose";
import { Rol } from "./constants";

const COOKIE_NAME = "renovaciones_session";
const DURACION_SEGUNDOS = 60 * 60 * 24 * 30; // 30 días

// Para que el deploy funcione sin configurar variables de entorno de entrada;
// en producción real conviene fijar SESSION_SECRET en Vercel.
const DEFAULT_SECRET = "Zv3nWJmz2h9Xv4o1jvYQyOaHrGY0F0YkFTQOVX3G1lk=";

function secretKey() {
  const secret = process.env.SESSION_SECRET || DEFAULT_SECRET;
  return new TextEncoder().encode(secret);
}

export type SesionPayload = {
  id: string;
  nombre: string;
  rol: Rol;
};

export async function firmarSesion(payload: SesionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SEGUNDOS}s`)
    .sign(secretKey());
}

export async function verificarSesion(token: string): Promise<SesionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.id === "string" && typeof payload.nombre === "string" && typeof payload.rol === "string") {
      return { id: payload.id, nombre: payload.nombre, rol: payload.rol as Rol };
    }
    return null;
  } catch {
    return null;
  }
}

export { COOKIE_NAME, DURACION_SEGUNDOS };
