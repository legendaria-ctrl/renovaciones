import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Proxy a la API real de Google Sheets (values.get), no al CSV exportado.
 * Devuelve JSON limpio por rango de celdas: evita los problemas de parseo
 * de CSV (comillas, comas, filas mal alineadas) que causaron bugs antes.
 */
export async function GET() {
  const sheetId = process.env.SHEET_ID;
  const apiKey = process.env.SHEET_API_KEY;
  const range = process.env.SHEET_RANGE || "A:Z";

  if (!sheetId || !apiKey) {
    return NextResponse.json({ error: "Falta configurar SHEET_ID o SHEET_API_KEY" }, { status: 500 });
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data?.error?.message || "Error leyendo el sheet" }, { status: res.status });
  }

  return NextResponse.json({ values: data.values || [] });
}
