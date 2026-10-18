/** Aceita só dígitos, no máximo 2 (0–99). */
export function normalizeIdadeInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 2);
}

/** Converte texto legado da planilha para o campo numérico do formulário. */
export function idadeToFormValue(idade: string | null | undefined) {
  if (!idade?.trim()) return "";
  const match = idade.trim().match(/^(\d{1,2})/);
  return match ? match[1] : "";
}

/** Exibe idade no card: número puro vira "8 anos". */
export function formatIdadeDisplay(idade: string | null | undefined) {
  if (!idade?.trim()) return "Idade não informada";

  const trimmed = idade.trim();
  const onlyNum = trimmed.match(/^(\d{1,2})$/);
  if (onlyNum) return `${Number(onlyNum[1])} anos`;

  const withAnos = trimmed.match(/^(\d{1,2})\s*anos?\.?$/i);
  if (withAnos) return `${Number(withAnos[1])} anos`;

  // Textos legados (ex.: "1 ano e 6 meses") permanecem como estão
  return trimmed;
}

export function firstLetterKey(nome: string) {
  const normalized = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

  const ch = normalized[0] ?? "";
  if (ch >= "A" && ch <= "Z") return ch;
  return "#";
}
