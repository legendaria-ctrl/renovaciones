"use client";

import { useEffect, useState } from "react";
import { useSesion } from "@/lib/session-context";
import { puedeAsignar, ROLES, MONEDAS } from "@/lib/constants";
import { listarLeadsCompletos } from "@/lib/leadsService";
import { listarVentasAprobadas } from "@/lib/pendientesService";
import { listarVendedoresYAdminsActivos } from "@/lib/vendedoresService";
import { Lead, SolicitudAbono, Usuario } from "@/lib/types";

type ResumenVendedorDashboard = {
  vendedorId: string;
  vendedorNombre: string;
  leadsAsignados: number;
  leadsVencidos: number;
  ventas: number;
  comisionesPorMoneda: Record<string, number>;
};

function BarraDoble({
  label,
  a,
  b,
  colorA,
  colorB,
  labelA,
  labelB,
}: {
  label: string;
  a: number;
  b: number;
  colorA: string;
  colorB: string;
  labelA: string;
  labelB: string;
}) {
  const total = a + b || 1;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted">
          {a + b} en total
        </span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
        <div className={colorA} style={{ width: `${(a / total) * 100}%` }} />
        <div className={colorB} style={{ width: `${(b / total) * 100}%` }} />
      </div>
      <div className="flex items-center gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${colorA}`} /> {labelA}: {a}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${colorB}`} /> {labelB}: {b}
        </span>
      </div>
    </div>
  );
}

function TarjetaNumero({ label, valor }: { label: string; valor: string | number }) {
  return (
    <div className="shell rounded-[1.5rem] p-2 diffused">
      <div className="core rounded-[calc(1.5rem-0.5rem)] p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">{valor}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { usuario } = useSesion();
  const esGlobal = puedeAsignar(usuario?.rol);

  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [ventas, setVentas] = useState<SolicitudAbono[]>([]);
  const [vendedores, setVendedores] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    let cancelado = false;
    (async () => {
      setCargando(true);
      setError(null);
      try {
        const [todosLosLeads, todasLasVentas, todosLosVendedores] = await Promise.all([
          listarLeadsCompletos(),
          esGlobal ? listarVentasAprobadas() : Promise.resolve([]),
          esGlobal ? listarVendedoresYAdminsActivos() : Promise.resolve([]),
        ]);
        if (cancelado) return;
        setLeads(usuario.rol === ROLES.VENDEDOR ? todosLosLeads.filter((l) => l.vendedorId === usuario.id) : todosLosLeads);
        setVentas(todasLasVentas);
        setVendedores(todosLosVendedores);
      } catch (err) {
        if (!cancelado) setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [usuario, esGlobal]);

  if (cargando || !leads) {
    return <p className="py-8 text-center text-sm text-muted">Cargando…</p>;
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-sm text-danger">{error}</p>
      </div>
    );
  }

  const ahora = new Date();
  const total = leads.length;
  const vencidosSinergetico = leads.filter((l) => l.vencimientoSinergetico < ahora).length;
  const activosSinergetico = total - vencidosSinergetico;

  const conLive = leads.filter((l) => l.liveMeses != null || l.vencimientoLive != null);
  const vencidosLive = conLive.filter((l) => l.vencimientoLive && l.vencimientoLive < ahora).length;
  const activosLive = conLive.length - vencidosLive;
  const sinLive = total - conLive.length;

  const sinAsignar = leads.filter((l) => !l.vendedorId).length;
  const apartados = leads.filter((l) => l.apartado).length;
  const noContactar = leads.filter((l) => l.noContactar).length;

  const totalesComisionPorMoneda = ventas.reduce<Record<string, number>>((acc, v) => {
    const m = v.productoComisionMoneda ?? v.productoMoneda ?? MONEDAS.MXN;
    acc[m] = (acc[m] ?? 0) + (v.productoComision ?? 0);
    return acc;
  }, {});

  const resumenVendedores: ResumenVendedorDashboard[] = esGlobal
    ? vendedores
        .map((v) => {
          const leadsDelVendedor = leads.filter((l) => l.vendedorId === v.id);
          const ventasDelVendedor = ventas.filter((s) => s.vendedorId === v.id);
          const comisionesPorMoneda = ventasDelVendedor.reduce<Record<string, number>>((acc, s) => {
            const m = s.productoComisionMoneda ?? s.productoMoneda ?? MONEDAS.MXN;
            acc[m] = (acc[m] ?? 0) + (s.productoComision ?? 0);
            return acc;
          }, {});
          return {
            vendedorId: v.id,
            vendedorNombre: v.nombre,
            leadsAsignados: leadsDelVendedor.length,
            leadsVencidos: leadsDelVendedor.filter((l) => l.vencimientoSinergetico < ahora).length,
            ventas: ventasDelVendedor.length,
            comisionesPorMoneda,
          };
        })
        .sort((a, b) => b.leadsAsignados - a.leadsAsignados)
    : [];

  const maxLeadsVendedor = Math.max(1, ...resumenVendedores.map((r) => r.leadsAsignados));

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        Dashboard{!esGlobal && usuario ? ` · ${usuario.nombre}` : ""}
      </h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <TarjetaNumero label="Total leads" valor={total.toLocaleString("es-MX")} />
        <TarjetaNumero label="Vencidos (Sinergético)" valor={vencidosSinergetico.toLocaleString("es-MX")} />
        <TarjetaNumero label="Vencidos (Live)" valor={vencidosLive.toLocaleString("es-MX")} />
        {esGlobal && <TarjetaNumero label="Sin asignar" valor={sinAsignar.toLocaleString("es-MX")} />}
        <TarjetaNumero label="Apartados" valor={apartados.toLocaleString("es-MX")} />
        <TarjetaNumero label="No contactar" valor={noContactar.toLocaleString("es-MX")} />
      </div>

      <div className="shell rounded-[1.75rem] p-2 diffused">
        <div className="core flex flex-col gap-5 rounded-[calc(1.75rem-0.5rem)] p-5">
          <h2 className="text-sm font-semibold text-foreground">Estado de membresías</h2>
          <BarraDoble
            label="Club Sinergético"
            a={activosSinergetico}
            b={vencidosSinergetico}
            colorA="bg-success"
            colorB="bg-danger"
            labelA="Activos"
            labelB="Vencidos"
          />
          <BarraDoble
            label="Club Sinergético Live"
            a={activosLive}
            b={vencidosLive}
            colorA="bg-success"
            colorB="bg-danger"
            labelA="Activos"
            labelB="Vencidos"
          />
          <p className="text-xs text-muted">{sinLive.toLocaleString("es-MX")} leads nunca compraron Live.</p>
        </div>
      </div>

      {esGlobal && (
        <div className="shell rounded-[1.75rem] p-2 diffused">
          <div className="core flex flex-col gap-2 rounded-[calc(1.75rem-0.5rem)] p-5">
            <h2 className="text-sm font-semibold text-foreground">Ventas y comisiones (histórico)</h2>
            <p className="text-2xl font-semibold text-foreground">
              {ventas.length.toLocaleString("es-MX")} <span className="text-sm font-normal text-muted">ventas autorizadas</span>
            </p>
            <p className="text-sm text-muted">
              {Object.entries(totalesComisionPorMoneda)
                .map(([m, t]) => `$${t.toLocaleString("es-MX")} ${m}`)
                .join(" · ") || "Sin comisiones registradas todavía."}
            </p>
          </div>
        </div>
      )}

      {esGlobal && (
        <div className="shell rounded-[1.75rem] p-2 diffused">
          <div className="core flex flex-col gap-1 rounded-[calc(1.75rem-0.5rem)] p-5">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Por vendedor</h2>
            {resumenVendedores.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No hay vendedores activos.</p>
            ) : (
              <div className="flex flex-col divide-y divide-silver/60">
                {resumenVendedores.map((r) => (
                  <div key={r.vendedorId} className="flex flex-col gap-1.5 py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{r.vendedorNombre}</span>
                      <span className="text-xs text-muted">
                        {r.leadsAsignados} leads · {r.leadsVencidos} vencidos · {r.ventas} ventas
                        {Object.entries(r.comisionesPorMoneda).length > 0 &&
                          ` · ${Object.entries(r.comisionesPorMoneda)
                            .map(([m, t]) => `$${t.toLocaleString("es-MX")} ${m}`)
                            .join(" · ")}`}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(r.leadsAsignados / maxLeadsVendedor) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
