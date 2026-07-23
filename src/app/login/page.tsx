"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signInWithEmailAndPassword } from "firebase/auth";
import { KeyRound, Mail, ArrowUpRight, LoaderCircle, Eye, EyeOff } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useSesion } from "@/lib/session-context";

export default function LoginPage() {
  const router = useRouter();
  const { usuario, cargando } = useSesion();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mostrarClave, setMostrarClave] = useState(false);

  useEffect(() => {
    if (!cargando && usuario) router.replace("/");
  }, [cargando, usuario, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, correo.trim(), clave);
      router.push("/");
    } catch {
      setError("Correo o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="bg-brand relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden px-4 pb-16 md:px-12"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 4rem)" }}
    >
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center md:items-start md:text-left">
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
              Inicia sesión con tu correo y contraseña.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="shell rounded-[2rem] p-2 diffused-lg">
          <div className="core flex flex-col gap-5 rounded-[calc(2rem-0.5rem)] p-8">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">Correo</span>
              <div className="flex items-center gap-2 rounded-2xl border border-silver-deep/60 bg-surface-2 px-4 py-3 transition-all duration-500 ease-spring focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
                <Mail className="h-4 w-4 text-muted" strokeWidth={1.5} />
                <input
                  type="email"
                  required
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted/60"
                />
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">Contraseña</span>
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
                  {mostrarClave ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.5} />
                  )}
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
