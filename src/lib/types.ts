export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; conflict?: boolean };

export type CriancaInput = {
  id?: string;
  nome: string;
  idade: string;
  version?: number;
  presente?: boolean;
  checkinEm?: string | null;
  _delete?: boolean;
};

export type AcompanhanteInput = {
  nome: string;
  telefone: string;
};

export type FamiliaFormData = {
  id?: string;
  nome: string;
  ehColaborador: boolean;
  area: string;
  telefone: string;
  acompanhantes: AcompanhanteInput[];
  version?: number;
  criancas: CriancaInput[];
};

export function parseAcompanhantes(value: unknown): AcompanhanteInput[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") {
        return { nome: item.trim(), telefone: "" };
      }
      if (item && typeof item === "object") {
        const row = item as Record<string, unknown>;
        return {
          nome: String(row.nome ?? "").trim(),
          telefone: String(row.telefone ?? "").trim(),
        };
      }
      return { nome: "", telefone: "" };
    })
    .filter((item) => item.nome.length > 0 || item.telefone.length > 0);
}

export function normalizeAcompanhantes(list: AcompanhanteInput[] | undefined) {
  return (list ?? [])
    .map((item) => ({
      nome: item.nome.trim(),
      telefone: item.telefone.trim() || null,
    }))
    .filter((item) => item.nome.length > 0);
}
