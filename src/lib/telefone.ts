export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

/** Formata telefone BR enquanto digita: (85) 99999-9999 */
export function formatTelefoneBR(value: string) {
  const d = digitsOnly(value).slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Persiste só dígitos (ou null). */
export function telefoneToStorage(value: string | null | undefined) {
  const d = digitsOnly(value ?? "");
  return d.length > 0 ? d : null;
}

export function formatTelefoneDisplay(value: string | null | undefined) {
  if (!value?.trim()) return null;
  const formatted = formatTelefoneBR(value);
  return formatted || value.trim();
}
