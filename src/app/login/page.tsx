"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  KeyRound,
  UserRound,
  ArrowUpRight,
  LoaderCircle,
  ShieldCheck,
  Users,
  UsersRound,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { useSesion } from "@/lib/session-context";
import { ROLES, ROL_LABEL, Rol } from "@/lib/constants";

function claveNombreRecordado(rol: Rol) {
  return `renovaciones_nombre_${rol}`;
}

const OPCIONES_ROL: { rol: Rol; icon: typeof Users }[] = [
  { rol: ROLES.VENDEDOR, icon: Users },
  { rol: ROLES.COORDINADOR, icon: UsersRound },
  { rol: ROLES.ADMIN, icon: ShieldCheck },
];

export default function LoginPage() {
  const router = useRouter();
  const { establecerSesion } = useSesion();
  const [rol, setRol] = useState<Rol>(ROLES.VENDEDOR);
  const [nombre, setNombre] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nombreBloqueado, setNombreBloqueado] = useState(false);
  const [avisoRevocado, setAvisoRevocado] = useState(false);
  const [mostrarClave, setMostrarClave] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("motivo") === "revocado") {
      setAvisoRevocado(true);
    }
  }, []);

  useEffect(() => {
    const recordado = window.localStorage.getItem(claveNombreRecordado(rol));
    if (recordado) {
      setNombre(recordado);
      setNombreBloqueado(true);
    } else {
      setNombre("");
      setNombreBloqueado(false);
    }
  }, [rol]);

  function cambiarPersona() {
    setNombreBloqueado(false);
    setNombre("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, rol, clave }),
    });

    setLoading(false);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error || "No se pudo iniciar sesión.");
      return;
    }

    window.localStorage.setItem(claveNombreRecordado(rol), nombre.trim());
    establecerSesion(data.session);
    router.push("/");
  }

  return (
    <main
      className="bg-brand relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden px-4 pb-16 md:px-12"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 4rem)" }}
    >
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image
            src="/renovacion-logo.png"
            alt="Renovaciones"
            width={72}
            height={72}
            priority
            className="h-16 w-16 drop-shadow-[0_10px_30px_rgba(87,161,255,0.45)]"
          />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Renovaciones<span className="text-primary-glow">.</span>
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Elige tu perfil, escribe tu nombre y la clave de acceso.
            </p>
          </div>
        </div>

        {avisoRevocado && (
          <div className="mb-4 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
            Tu acceso fue revocado. Pídele a un administrador o coordinador que te vuelva a aprobar
            en Equipo.
          </div>
        )}

        <form onSubmit={handleSubmit} className="shell rounded-[2rem] p-2 diffused-lg">
          <div className="core flex flex-col gap-5 rounded-[calc(2rem-0.5rem)] p-8">
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-surface-2 p-1">
              {OPCIONES_ROL.map(({ rol: r, icon: Icon }) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRol(r)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-medium transition-all duration-500 ease-spring ${
                    rol === r
                      ? "bg-surface text-primary shadow-[0_6px_16px_-6px_rgba(10,92,255,0.35)]"
                      : "text-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                  {ROL_LABEL[r]}
                </button>
              ))}
            </div>

            <label className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted">Tu nombre</span>
                {nombreBloqueado && (
                  <button
                    type="button"
                    onClick={cambiarPersona}
                    className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                  >
                    ¿No eres tú?
                  </button>
                )}
              </div>
              <div
                className={`flex items-center gap-2 rounded-2xl border border-silver-deep/60 px-4 py-3 transition-all duration-500 ease-spring focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 ${
                  nombreBloqueado ? "bg-primary-dim" : "bg-surface-2"
                }`}
              >
                {nombreBloqueado ? (
                  <Lock className="h-4 w-4 text-primary" strokeWidth={1.5} />
                ) : (
                  <UserRound className="h-4 w-4 text-muted" strokeWidth={1.5} />
                )}
                <input
                  required
                  readOnly={nombreBloqueado}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Escribe tu nombre"
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted/60"
                />
              </div>
              {nombreBloqueado && (
                <p className="text-xs text-muted">
                  Ya iniciaste sesión antes en este dispositivo como <strong>{nombre}</strong>. Usa
                  siempre el mismo nombre para que no te tengan que aprobar de nuevo.
                </p>
              )}
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">Clave de acceso</span>
              <div className="flex items-center gap-2 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-3 transition-all duration-500 ease-spring focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
                <KeyRound className="h-4 w-4 text-muted" strokeWidth={1.5} />
                <input
                  type={mostrarClave ? "text" : "password"}
                  required
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted/60"
                />
                <button
                  type="button"
                  onClick={() => setMostrarClave((v) => !v)}
                  className="flex h-6 w-6 flex-none items-center justify-center text-muted transition-colors duration-200 hover:text-foreground"
                >
                  {mostrarClave ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                </button>
              </div>
            </label>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="group mt-2 flex items-center justify-between rounded-full bg-primary py-1 pl-6 pr-1 text-sm font-medium text-white shadow-[0_10px_30px_-8px_rgba(10,92,255,0.55)] transition-all duration-500 ease-spring hover:shadow-[0_14px_36px_-6px_rgba(10,92,255,0.6)] active:scale-[0.98] disabled:opacity-60"
            >
              <span className="py-2">{loading ? "Ingresando…" : "Entrar"}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-spring group-hover:translate-x-1 group-hover:-translate-y-[1px]">
                {loading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                ) : (
                  <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
                )}
              </span>
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
