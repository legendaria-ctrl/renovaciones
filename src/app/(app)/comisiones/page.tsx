"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { listarProductos, crearProducto, actualizarProducto } from "@/lib/productosService";
import { listarVentasAprobadas } from "@/lib/pendientesService";
import { aFecha } from "@/lib/membership";
import { Producto, SolicitudAbono } from "@/lib/types";

type ResumenVendedor = {
  vendedorId: string;
  vendedorNombre: string;
  ventas: number;
  totalComision: number;
};

function resumirPorVendedor(ventas: SolicitudAbono[]): ResumenVendedor[] {
  const mapa = new Map<string, ResumenVendedor>();
  for (const v of ventas) {
    const actual = mapa.get(v.vendedorId) ?? {
      vendedorId: v.vendedorId,
      vendedorNombre: v.vendedorNombre,
      ventas: 0,
      totalComision: 0,
    };
    actual.ventas += 1;
    actual.totalComision += v.productoComision ?? 0;
    mapa.set(v.vendedorId, actual);
  }
  return Array.from(mapa.values()).sort((a, b) => b.totalComision - a.totalComision);
}

export default function ComisionesPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ventas, setVentas] = useState<SolicitudAbono[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [precioTotal, setPrecioTotal] = useState(0);
  const [comisionPorVenta, setComisionPorVenta] = useState(0);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [p, v] = await Promise.all([listarProductos(true), listarVentasAprobadas()]);
      setProductos(p);
      setVentas(v);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la información.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || precioTotal <= 0) return;
    setGuardando(true);
    await crearProducto({ nombre: nombre.trim(), precioTotal, comisionPorVenta });
    setNombre("");
    setPrecioTotal(0);
    setComisionPorVenta(0);
    setFormAbierto(false);
    setGuardando(false);
    cargar();
  }

  async function toggleActivo(p: Producto) {
    await actualizarProducto(p.id, { activo: !p.activo });
    cargar();
  }

  const resumen = resumirPorVendedor(ventas);
  const totalComisionGeneral = resumen.reduce((s, r) => s + r.totalComision, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Comisiones</h1>
        <button
          onClick={() => setFormAbierto((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-[0_10px_24px_-8px_rgba(10,92,255,0.5)] transition-all duration-500 ease-spring active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          Nuevo producto
        </button>
      </div>

      {formAbierto && (
        <form onSubmit={crear} className="shell rounded-[1.75rem] p-2 diffused">
          <div className="core grid grid-cols-1 gap-3 rounded-[calc(1.75rem-0.5rem)] p-6 sm:grid-cols-3">
            <input
              required
              placeholder="Nombre del producto"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="rounded-xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm outline-none sm:col-span-3"
            />
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">Precio total</span>
              <input
                type="number"
                min={1}
                required
                value={precioTotal || ""}
                onChange={(e) => setPrecioTotal(parseFloat(e.target.value) || 0)}
                className="rounded-xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">Comisión por venta</span>
              <input
                type="number"
                min={0}
                value={comisionPorVenta || ""}
                onChange={(e) => setComisionPorVenta(parseFloat(e.target.value) || 0)}
                className="rounded-xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={guardando}
              className="self-end rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {guardando ? "Creando…" : "Crear producto"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
          <span>{error}</span>
          <button onClick={cargar} className="font-medium underline">
            Reintentar
          </button>
        </div>
      )}

      <div className="shell rounded-[1.75rem] p-2 diffused">
        <div className="core flex flex-col gap-1 rounded-[calc(1.75rem-0.5rem)] p-4">
          <h2 className="px-2 pb-2 text-sm font-semibold text-foreground">Productos</h2>
          {cargando ? (
            <p className="py-8 text-center text-sm text-muted">Cargando…</p>
          ) : productos.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Aún no hay productos.</p>
          ) : (
            <div className="flex flex-col divide-y divide-silver/60">
              {productos.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.nombre}</p>
                    <p className="text-xs text-muted">
                      Precio ${p.precioTotal.toLocaleString("es-MX")} · Comisión $
                      {p.comisionPorVenta.toLocaleString("es-MX")}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleActivo(p)}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition-all duration-500 ease-spring active:scale-[0.98] ${
                      p.activo ? "bg-success/10 text-success" : "bg-surface-2 text-muted"
                    }`}
                  >
                    {p.activo ? "Activo" : "Inactivo"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="shell rounded-[1.75rem] p-2 diffused">
        <div className="core flex flex-col gap-1 rounded-[calc(1.75rem-0.5rem)] p-4">
          <div className="flex items-center justify-between px-2 pb-2">
            <h2 className="text-sm font-semibold text-foreground">Ventas por vendedor</h2>
            <span className="text-xs text-muted">
              Total comisiones: ${totalComisionGeneral.toLocaleString("es-MX")}
            </span>
          </div>
          {cargando ? (
            <p className="py-8 text-center text-sm text-muted">Cargando…</p>
          ) : resumen.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Aún no hay ventas autorizadas.</p>
          ) : (
            <div className="flex flex-col divide-y divide-silver/60">
              {resumen.map((r) => (
                <div key={r.vendedorId} className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium text-foreground">{r.vendedorNombre}</span>
                  <span className="text-sm text-muted">
                    {r.ventas} venta{r.ventas === 1 ? "" : "s"} · ${r.totalComision.toLocaleString("es-MX")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="shell rounded-[1.75rem] p-2 diffused">
        <div className="core flex flex-col gap-1 rounded-[calc(1.75rem-0.5rem)] p-4">
          <h2 className="px-2 pb-2 text-sm font-semibold text-foreground">Últimas ventas autorizadas</h2>
          {ventas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Sin ventas todavía.</p>
          ) : (
            <div className="flex flex-col divide-y divide-silver/60">
              {ventas.slice(0, 30).map((v) => (
                <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{v.leadNombre}</p>
                    <p className="text-xs text-muted">
                      {v.productoNombre ?? "—"} · {v.vendedorNombre} ·{" "}
                      {aFecha(v.resueltoEn)?.toLocaleDateString("es-MX")}
                    </p>
                  </div>
                  <span className="text-sm text-success">
                    Comisión ${v.productoComision?.toLocaleString("es-MX") ?? 0}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
