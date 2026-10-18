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

export type FamiliaFormData = {
  id?: string;
  nome: string;
  area: string;
  telefone: string;
  acompanhantes: string[];
  version?: number;
  criancas: CriancaInput[];
};
