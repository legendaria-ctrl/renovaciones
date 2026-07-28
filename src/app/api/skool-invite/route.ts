import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion, COOKIE_NAME } from "@/lib/session";

export const dynamic = "force-dynamic";

// Se llama al enviar/reenviar la invitación de Skool desde el perfil del
// lead (o automáticamente al autorizar un pago). Dispara el webhook del
// grupo de Skool, que le manda a ese correo un link de invitación directo.
// La URL del webhook es secreta (quien la tenga puede invitar gente al
// grupo), así que se guarda en el servidor y nunca se expone al navegador.
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const sesion = token ? await verificarSesion(token) : null;
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const webhookUrl = process.env.SKOOL_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "Webhook de Skool no configurado" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const correo = typeof body?.correo === "string" ? body.correo.trim() : "";
  if (!correo) {
    return NextResponse.json({ error: "Falta el correo" }, { status: 400 });
  }

  try {
    const url = `${webhookUrl}?email=${encodeURIComponent(correo)}`;
    const res = await fetch(url, { method: "POST" });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Skool respondió con error (status ${res.status})` },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
