import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { firmarSesion, verificarSesion, COOKIE_NAME, DURACION_SEGUNDOS } from "@/lib/session";
import { verificarOCrearSolicitud, idPara } from "@/lib/vendedoresService";
import { ESTADOS_SOLICITUD, ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ session: null }, { headers: { "Cache-Control": "no-store" } });
  }
  const sesion = await verificarSesion(token);
  return NextResponse.json({ session: sesion }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const { nombre, rol, clave } = await req.json();

  if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "Escribe tu nombre" }, { status: 400 });
  }

  if (rol !== ROLES.ADMIN && rol !== ROLES.COORDINADOR && rol !== ROLES.VENDEDOR) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  // Claves de acceso compartidas por rol. Escritas aquí directamente para que
  // el deploy funcione sin configurar variables de entorno de entrada; en
  // producción real conviene fijarlas en Vercel.
  const CLAVES_DEFECTO: Record<string, string> = {
    ADMIN: "Renovaciones-Admin-2026",
    COORDINADOR: "Renovaciones-Coord-2026",
    VENDEDOR: "Renovaciones-Vende-2026",
  };
  const envVar: Record<string, string | undefined> = {
    ADMIN: process.env.ADMIN_PASSCODE,
    COORDINADOR: process.env.COORDINADOR_PASSCODE,
    VENDEDOR: process.env.VENDEDOR_PASSCODE,
  };
  const claveEsperada = envVar[rol] || CLAVES_DEFECTO[rol];

  if (clave !== claveEsperada) {
    return NextResponse.json({ error: "Clave de acceso incorrecta" }, { status: 401 });
  }

  const estadoSolicitud = await verificarOCrearSolicitud(nombre.trim(), rol);

  if (estadoSolicitud === ESTADOS_SOLICITUD.PENDIENTE) {
    return NextResponse.json(
      {
        error:
          "Tu acceso está pendiente de aprobación. Pídele a un administrador o coordinador que te apruebe en Equipo.",
        pendiente: true,
      },
      { status: 403 }
    );
  }

  if (estadoSolicitud === ESTADOS_SOLICITUD.RECHAZADO) {
    return NextResponse.json({ error: "Tu acceso fue rechazado." }, { status: 403 });
  }

  const id = idPara(nombre.trim(), rol);
  const token = await firmarSesion({ id, nombre: nombre.trim(), rol });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_SEGUNDOS,
  });

  return NextResponse.json({ session: { id, nombre: nombre.trim(), rol } });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
