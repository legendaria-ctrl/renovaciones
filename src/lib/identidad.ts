/** Últimos 10 dígitos numéricos del teléfono, usados como identificador secundario del lead. */
export function ultimos10Digitos(telefono: string | null | undefined): string | null {
  if (!telefono) return null;
  const digitos = telefono.replace(/\D/g, "");
  if (digitos.length < 10) return null;
  return digitos.slice(-10);
}

export function normalizarEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const limpio = email.trim().toLowerCase();
  return limpio.length > 0 ? limpio : null;
}

/** Clave de identidad del lead: correo si existe, si no últimos 10 dígitos del teléfono. */
export function claveIdentidad(email: string | null | undefined, telefono: string | null | undefined): string | null {
  return normalizarEmail(email) ?? ultimos10Digitos(telefono);
}
