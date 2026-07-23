import { NextResponse } from "next/server";

// Proxy simple: evita CORS al leer el CSV público del sheet desde el navegador.
// El sheet debe estar compartido como "cualquiera con el enlace puede ver".
export async function GET() {
  const sheetId = process.env.SHEET_ID;
  const gid = process.env.SHEET_GID ?? "0";
  if (!sheetId) {
    return NextResponse.json({ error: "Falta configurar SHEET_ID" }, { status: 500 });
  }

  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: `No se pudo leer el sheet (${res.status})` }, { status: 502 });
  }
  const texto = await res.text();
  return new NextResponse(texto, { headers: { "Content-Type": "text/csv; charset=utf-8" } });
}
