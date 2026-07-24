"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, X, Check, ChevronDown } from "lucide-react";
import { listarProductos, crearProducto, actualizarProducto } from "@/lib/productosService";
import { listarVentasAprobadas } from "@/lib/pendientesService";
import { listarVendedoresActivos } from "@/lib/vendedoresService";
import { aFecha } from "@/lib/membership";
import { MONEDAS, Moneda } from "@/lib/constants";
import { Producto, SolicitudAbono, Usuario } from "@/lib/types";

type ResumenVendedor = {
  vendedorId: string;
  vendedorNombre: string;
  ventas: SolicitudAbono[];
  totalesPorMoneda: Record<string, number>;
};

function resumirPorVendedor(ventas: SolicitudAbono[], vendedores: Usuario[]): ResumenVendedor[] {
  const mapa = new Map<string, ResumenVendedor>();
  for (const u of vendedores) {
    mapa.set(u.id, { vendedorId: u.id, vendedorNombre: u.nombre, ventas: [], totalesPorMoneda: {} });
  }
  for (const v of ventas) {
    const moneda = v.productoComisionMoneda ?? v.productoMoneda ?? MONEDAS.MXN;
    const actual = mapa.get(v.vendedorId) ?? {
      vendedorId: v.vendedorId,
      vendedorNombre: v.vendedorNombre,
      ventas: [],
      totalesPorMoneda: {},
    };
    actual.ventas.push(v);
    actual.totalesPorMoneda[moneda] = (actual.totalesPorMoneda[moneda] ?? 0) + (v.productoComision ?? 0);
    mapa.set(v.vendedorId, actual);
  }
  return Array.from(mapa.values()).sort((a, b) => b.ventas.length - a.ventas.length);
}

export default function ComisionesPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ventas, setVentas] = useState<SolicitudAbono[]>([]);
  const [vendedores, setVendedores] = useState<Usuario[]>([]);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [precioTotal, setPrecioTotal] = useState(0);
  const [moneda, setMoneda] = useState<Moneda>(MONEDAS.MXN);
  const [comisionPorVenta, setComisionPorVenta] = useState(0);
  const [comisionMoneda, setComisionMoneda] = useState<Moneda>(MONEDAS.MXN);
  const [guardando, setGuardando] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editPrecio, setEditPrecio] = useState(0);
  const [editMoneda, setEditMoneda] = useState<Moneda>(MONEDAS.MXN);
  const [editComision, setEditComision] = useState(0);
  const [editComisionMoneda, setEditComisionMoneda] = useState<Moneda>(MONEDAS.MXN);
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [p, v, u] = await Promise.all([listarProductos(true), listarVentasAprobadas(), listarVendedoresActivos()]);
      setProductos(p);
      setVentas(v);
      setVendedores(u);
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
    await crearProducto({ nombre: nombre.trim(), precioTotal, moneda, comisionPorVenta, comisionMoneda });
    setNombre("");
    setPrecioTotal(0);
    setMoneda(MONEDAS.MXN);
    setComisionPorVenta(0);
    setComisionMoneda(MONEDAS.MXN);
    setFormAbierto(false);
    setGuardando(false);
    cargar();
  }

  async function toggleActivo(p: Producto) {
    await actualizarProducto(p.id, { activo: !p.activo });
    cargar();
  }

  function abrirEdicion(p: Producto) {
    setEditandoId(p.id);
    setEditNombre(p.nombre);
    setEditPrecio(p.precioTotal);
    setEditMoneda(p.moneda);
    setEditComision(p.comisionPorVenta);
    setEditComisionMoneda(p.comisionMoneda ?? p.moneda);
  }

  async function guardarEdicion(id: string) {
    if (!editNombre.trim() || editPrecio <= 0) return;
    setGuardandoEdit(true);
    await actualizarProducto(id, {
      nombre: editNombre.trim(),
      precioTotal: editPrecio,
      moneda: editMoneda,
      comisionPorVenta: editComision,
      comisionMoneda: editComisionMoneda,
    });
    setEditandoId(null);
    setGuardandoEdit(false);
    cargar();
  }

  const ventasFiltradas = ventas.filter((v) => {
    const fecha = aFecha(v.resueltoEn);
    if (!fecha) return false;
    if (desde && fecha < new Date(`${desde}T00:00:00`)) return false;
    if (hasta && fecha > new Date(`${hasta}T23:59:59`)) return false;
    return true;
  });

  const resumen = resumirPorVendedor(ventasFiltradas, vendedores);
  const totalesPorMoneda = resumen.reduce<Record<string, number>>((acc, r) => {
    for (const [m, total] of Object.entries(r.totalesPorMoneda)) {
      acc[m] = (acc[m] ?? 0) + total;
    }
    return acc;
  }, {});

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
              <span className="text-xs font-medium uppercase tracking-wider text-muted">Moneda</span>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as Moneda)}
                className="rounded-xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm outline-none"
              >
                <option value={MONEDAS.MXN}>MXN</option>
                <option value={MONEDAS.USD}>USD</option>
              </select>
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
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">Moneda de la comisión</span>
              <select
                value={comisionMoneda}
                onChange={(e) => setComisionMoneda(e.target.value as Moneda)}
                className="rounded-xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm outline-none"
              >
                <option value={MONEDAS.MXN}>MXN</option>
                <option value={MONEDAS.USD}>USD</option>
              </select>
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
              {productos.map((p) =>
                editandoId === p.id ? (
                  <div key={p.id} className="grid grid-cols-2 gap-3 py-3 sm:grid-cols-5">
                    <input
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      className="col-span-2 rounded-xl border border-silver-deep/60 bg-surface-2 px-3 py-2 text-sm outline-none sm:col-span-5"
                      placeholder="Nombre del producto"
                    />
                    <input
                      type="number"
                      min={1}
                      value={editPrecio || ""}
                      onChange={(e) => setEditPrecio(parseFloat(e.target.value) || 0)}
                      className="rounded-xl border border-silver-deep/60 bg-surface-2 px-3 py-2 text-sm outline-none"
                      placeholder="Precio total"
                    />
                    <select
                      value={editMoneda}
                      onChange={(e) => setEditMoneda(e.target.value as Moneda)}
                      className="rounded-xl border border-silver-deep/60 bg-surface-2 px-3 py-2 text-sm outline-none"
                    >
                      <option value={MONEDAS.MXN}>MXN</option>
                      <option value={MONEDAS.USD}>USD</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      value={editComision || ""}
                      onChange={(e) => setEditComision(parseFloat(e.target.value) || 0)}
                      className="rounded-xl border border-silver-deep/60 bg-surface-2 px-3 py-2 text-sm outline-none"
                      placeholder="Comisión por venta"
                    />
                    <select
                      value={editComisionMoneda}
                      onChange={(e) => setEditComisionMoneda(e.target.value as Moneda)}
                      className="rounded-xl border border-silver-deep/60 bg-surface-2 px-3 py-2 text-sm outline-none"
                      title="Moneda de la comisión"
                    >
                      <option value={MONEDAS.MXN}>Comisión MXN</option>
                      <option value={MONEDAS.USD}>Comisión USD</option>
                    </select>
                    <div className="col-span-2 flex gap-2 sm:col-span-1">
                      <button
                        onClick={() => guardarEdicion(p.id)}
                        disabled={guardandoEdit}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" strokeWidth={1.75} />
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditandoId(null)}
                        className="flex items-center justify-center rounded-xl border border-silver-deep/60 bg-surface-2 px-3 text-muted"
                      >
                        <X className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.nombre}</p>
                      <p className="text-xs text-muted">
                        Precio ${p.precioTotal.toLocaleString("es-MX")} {p.moneda} · Comisión $
                        {p.comisionPorVenta.toLocaleString("es-MX")} {p.comisionMoneda}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => abrirEdicion(p)}
                        title="Editar producto"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-silver-deep/60 bg-surface-2 text-muted transition-all duration-500 ease-spring hover:text-foreground active:scale-[0.98]"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                      <button
                        onClick={() => toggleActivo(p)}
                        className={`rounded-xl px-3 py-2 text-sm font-medium transition-all duration-500 ease-spring active:scale-[0.98] ${
                          p.activo ? "bg-success/10 text-success" : "bg-surface-2 text-muted"
                        }`}
                      >
                        {p.activo ? "Activo" : "Inactivo"}
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      <div className="shell rounded-[1.75rem] p-2 diffused">
        <div className="core flex flex-col gap-1 rounded-[calc(1.75rem-0.5rem)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2">
            <h2 className="text-sm font-semibold text-foreground">Ventas por vendedor</h2>
            <span className="text-xs text-muted">
              {Object.entries(totalesPorMoneda)
                .map(([m, total]) => `${total.toLocaleString("es-MX")} ${m}`)
                .join(" · ") || "Total comisiones: $0"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 px-2 pb-2">
            <label className="flex items-center gap-1.5 text-xs text-muted">
              Desde
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="rounded-lg border border-silver-deep/60 bg-surface-2 px-2 py-1.5 text-sm outline-none"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              Hasta
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="rounded-lg border border-silver-deep/60 bg-surface-2 px-2 py-1.5 text-sm outline-none"
              />
            </label>
            {(desde || hasta) && (
              <button
                onClick={() => {
                  setDesde("");
                  setHasta("");
                }}
                className="text-xs font-medium text-primary underline"
              >
                Quitar filtro
              </button>
            )}
          </div>
          {cargando ? (
            <p className="py-8 text-center text-sm text-muted">Cargando…</p>
          ) : resumen.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Aún no hay vendedores activos.</p>
          ) : (
            <div className="flex flex-col divide-y divide-silver/60">
              {resumen.map((r) => {
                const abierto = expandidoId === r.vendedorId;
                const totalesTexto =
                  Object.entries(r.totalesPorMoneda)
                    .map(([m, total]) => `$${total.toLocaleString("es-MX")} ${m}`)
                    .join(" · ") || "$0";
                return (
                  <div key={r.vendedorId} className="py-2">
                    <button
                      onClick={() => setExpandidoId(abierto ? null : r.vendedorId)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left transition-all duration-500 ease-spring hover:bg-surface-2"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <ChevronDown
                          className={`h-4 w-4 text-muted transition-transform duration-300 ${abierto ? "rotate-180" : ""}`}
                          strokeWidth={1.75}
                        />
                        {r.vendedorNombre}
                      </span>
                      <span className="text-sm text-muted">
                        {r.ventas.length} venta{r.ventas.length === 1 ? "" : "s"} · {totalesTexto}
                      </span>
                    </button>
                    {abierto && (
                      <div className="mt-1 flex flex-col gap-2 rounded-xl bg-surface-2 px-3 py-3">
                        {r.ventas.length === 0 ? (
                          <p className="py-2 text-center text-xs text-muted">
                            {desde || hasta ? "Sin ventas en ese rango." : "Sin ventas todavía."}
                          </p>
                        ) : (
                          r.ventas.map((v) => (
                            <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                              <div>
                                <p className="font-medium text-foreground">{v.leadNombre}</p>
                                <p className="text-xs text-muted">
                                  {v.productoNombre ?? "—"} · {aFecha(v.resueltoEn)?.toLocaleDateString("es-MX")}
                                </p>
                              </div>
                              <span className="text-success">
                                ${v.productoComision?.toLocaleString("es-MX") ?? 0}{" "}
                                {v.productoComisionMoneda ?? v.productoMoneda ?? ""}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="shell rounded-[1.75rem] p-2 diffused">
        <div className="core flex flex-col gap-1 rounded-[calc(1.75rem-0.5rem)] p-4">
          <h2 className="px-2 pb-2 text-sm font-semibold text-foreground">Últimas ventas autorizadas</h2>
          {ventasFiltradas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              {desde || hasta ? "Sin ventas en ese rango." : "Sin ventas todavía."}
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-silver/60">
              {ventasFiltradas.slice(0, 30).map((v) => (
                <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{v.leadNombre}</p>
                    <p className="text-xs text-muted">
                      {v.productoNombre ?? "—"} · {v.vendedorNombre} ·{" "}
                      {aFecha(v.resueltoEn)?.toLocaleDateString("es-MX")}
                    </p>
                  </div>
                  <span className="text-sm text-success">
                    Comisión ${v.productoComision?.toLocaleString("es-MX") ?? 0}{" "}
                    {v.productoComisionMoneda ?? v.productoMoneda ?? ""}
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
