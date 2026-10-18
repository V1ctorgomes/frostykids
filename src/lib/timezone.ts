const TIMEZONE = "America/Fortaleza";

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";

  const value = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function nowInFortaleza() {
  return new Date();
}
