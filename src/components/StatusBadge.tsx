import { EstadoLead, ESTADO_LABEL } from "@/lib/constants";

const ESTILOS: Record<EstadoLead, string> = {
  ACTIVO: "bg-success/10 text-success",
  VENCIDO: "bg-danger/10 text-danger",
  SIN_MEMBRESIA: "bg-surface-2 text-muted",
};

export function StatusBadge({ estado }: { estado: EstadoLead }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${ESTILOS[estado]}`}>
      {ESTADO_LABEL[estado]}
    </span>
  );
}
