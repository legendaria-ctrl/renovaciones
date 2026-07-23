"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, UserPlus, RefreshCw, ChevronRight } from "lucide-react";
import { useSesion } from "@/lib/session-context";
import { puedeAsignar, ROLES } from "@/lib/constants";
import {
  listarLeads,
  buscarLeads,
  asignarLeadsEnLote,
  FiltroMembresia,
  FiltroEstado,
} from "@/lib/leadsService";
import { listarVendedoresActivos } from "@/lib/vendedoresService";
import { estadoDesdeVencimiento, aFecha } from "@/lib/membership";
import { Lead, Usuario } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { AsignarLeadsModal } from "@/components/AsignarLeadsModal";

const TABS: { valor: FiltroMembresia; label: string }[] = [
  { valor: "TODOS", label: "Todos" },
  { valor: "SINERGETICO", label: "Club Sinergético" },
  { valor: "LIVE", label: "Club Sinergético Live" },
];

export default function LeadsPage() {
  const { usuario } = useSesion();
  const router = useRouter();

  const [membresia, setMembresia] = useState<FiltroMembresia>("TODOS");
  const [estado, setEstado] = useState<FiltroEstado>("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionActiva, setSeleccionActiva] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [modalAbierto, setModalAbierto] = useState(false);
  const [vendedores, setVendedores] = useState<Usuario[]>([]);

  const cargar = useCallback(async () => {
    setCargando(true);
    if (busqueda.trim()) {
      const res = await buscarLeads(busqueda);
      setLeads(res);
      setCargando(false);
      return;
    }
    const { leads: nuevos } = await listarLeads({
      membresia,
      estado,
      vendedorId: usuario?.rol === ROLES.VENDEDOR ? usuario.id : null,
    });
    setLeads(nuevos);
    setCargando(false);
  }, [membresia, estado, busqueda, usuario]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (puedeAsignar(usuario?.rol)) {
      listarVendedoresActivos().then(setVendedores);
    }
  }, [usuario]);

  function toggleSeleccion(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirmarAsignacion(vendedorIds: string[], cantidadPorVendedor: number) {
    await asignarLeadsEnLote(Array.from(seleccionados), vendedorIds, cantidadPorVendedor);
    setModalAbierto(false);
    setSeleccionActiva(false);
    setSeleccionados(new Set());
    cargar();
  }

  const campoVencimiento = membresia === "LIVE" ? "live" : "sinergetico";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Leads</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={cargar}
            title="Refrescar"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-silver-deep/60 bg-surface-2 text-muted transition-all duration-500 ease-spring hover:text-foreground active:scale-[0.98]"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
          </button>
          {puedeAsignar(usuario?.rol) && (
            <button
              onClick={() => setSeleccionActiva((v) => !v)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-500 ease-spring active:scale-[0.98] ${
                seleccionActiva
                  ? "bg-surface-2 text-muted"
                  : "bg-primary text-white shadow-[0_10px_24px_-8px_rgba(10,92,255,0.5)]"
              }`}
            >
              <UserPlus className="h-4 w-4" strokeWidth={1.75} />
              {seleccionActiva ? "Cancelar selección" : "Asignar leads"}
            </button>
          )}
        </div>
      </div>

      <div className="shell rounded-[1.75rem] p-2 diffused">
        <div className="core flex flex-col gap-4 rounded-[calc(1.75rem-0.5rem)] p-4">
          <div className="grid grid-cols-1 gap-2 rounded-2xl bg-surface-2 p-1 sm:grid-cols-3">
            {TABS.map((tab) => (
              <button
                key={tab.valor}
                onClick={() => setMembresia(tab.valor)}
                className={`rounded-xl py-2 text-sm font-medium transition-all duration-500 ease-spring ${
                  membresia === tab.valor
                    ? "bg-surface text-primary shadow-[0_6px_16px_-6px_rgba(10,92,255,0.35)]"
                    : "text-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5">
              <Search className="h-4 w-4 flex-none text-muted" strokeWidth={1.75} />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, correo o teléfono"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted/60"
              />
            </div>

            {!busqueda && (
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as FiltroEstado)}
                className="rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="ACTIVO">Activos</option>
                <option value="VENCIDO">Vencidos</option>
              </select>
            )}
          </div>

          {seleccionActiva && seleccionados.size > 0 && (
            <div className="flex items-center justify-between rounded-2xl bg-primary-dim px-4 py-3">
              <span className="text-sm font-medium text-primary">
                {seleccionados.size} lead{seleccionados.size === 1 ? "" : "s"} seleccionado
                {seleccionados.size === 1 ? "" : "s"}
              </span>
              <button
                onClick={() => setModalAbierto(true)}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-all duration-500 ease-spring active:scale-[0.98]"
              >
                Continuar
              </button>
            </div>
          )}

          <div className="flex flex-col divide-y divide-silver/60">
            {cargando ? (
              <p className="py-8 text-center text-sm text-muted">Cargando…</p>
            ) : leads.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No hay leads con estos filtros.</p>
            ) : (
              leads.map((lead) => {
                const venc = aFecha(
                  campoVencimiento === "live" ? lead.vencimientoLive : lead.vencimientoSinergetico
                );
                const est = estadoDesdeVencimiento(venc);

                return (
                  <div key={lead.id} className="flex items-center gap-3 py-3">
                    {seleccionActiva && (
                      <input
                        type="checkbox"
                        checked={seleccionados.has(lead.id)}
                        onChange={() => toggleSeleccion(lead.id)}
                        className="h-4 w-4 flex-none accent-primary"
                      />
                    )}
                    <button
                      onClick={() => !seleccionActiva && router.push(`/leads/${lead.id}`)}
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{lead.nombre}</p>
                        <p className="truncate text-xs text-muted">
                          {lead.correo ?? lead.telefono ?? "sin contacto"}
                        </p>
                      </div>
                      <div className="flex flex-none items-center gap-2">
                        <StatusBadge estado={est} />
                        {!seleccionActiva && <ChevronRight className="h-4 w-4 text-muted" strokeWidth={1.75} />}
                      </div>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {modalAbierto && (
        <AsignarLeadsModal
          vendedores={vendedores}
          onCancelar={() => setModalAbierto(false)}
          onConfirmar={confirmarAsignacion}
        />
      )}
    </div>
  );
}
