"use client";

import { useState } from "react";
import { UploadCloud, LoaderCircle } from "lucide-react";
import { actualizarLeadsNuevos, ResultadoImportacion } from "@/lib/importService";

export default function ImportarPage() {
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function actualizar() {
    setCargando(true);
    setError(null);
    try {
      setResultado(await actualizarLeadsNuevos());
    } catch {
      setError("No se pudo leer el sheet. Verifica que esté compartido como público y que SHEET_ID esté configurado.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Importar leads</h1>

      <div className="shell rounded-[1.75rem] p-2 diffused">
        <div className="core flex flex-col items-start gap-4 rounded-[calc(1.75rem-0.5rem)] p-6">
          <p className="text-sm text-muted">
            Lee el sheet de origen y trae solo las filas nuevas desde la última importación,
            comparando el número de fila (#). No vuelve a leer ni sobrescribir lo ya importado.
          </p>

          <button
            onClick={actualizar}
            disabled={cargando}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white shadow-[0_10px_24px_-8px_rgba(10,92,255,0.5)] transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-60"
          >
            {cargando ? (
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <UploadCloud className="h-4 w-4" strokeWidth={1.75} />
            )}
            {cargando ? "Actualizando…" : "Actualizar leads nuevos"}
          </button>

          {resultado && (
            <div
              className={`rounded-2xl px-4 py-3 text-sm ${
                resultado.limiteAlcanzado ? "bg-warning/10 text-warning" : "bg-surface-2 text-foreground"
              }`}
            >
              {resultado.limiteAlcanzado ? (
                <>
                  Se importaron {resultado.nuevos} leads y se llegó al límite diario gratuito de
                  Firestore (20,000 escrituras/día). El progreso quedó guardado — vuelve a presionar
                  &quot;Actualizar leads nuevos&quot; después de que se reinicie la cuota (medianoche,
                  hora del Pacífico) para traer el resto.
                </>
              ) : resultado.sinCambios ? (
                "No hay leads nuevos, el sheet no ha cambiado desde la última vez."
              ) : (
                `Se importaron ${resultado.nuevos} leads nuevos (hasta la fila #${resultado.ultimoNumeroSheet}).`
              )}
            </div>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </div>
    </div>
  );
}
