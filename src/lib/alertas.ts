import { parseAcompanhantes } from "@/lib/types";

type FamiliaAlerta = {
  nome: string;
  ehColaborador: boolean;
  area: string | null;
  telefone: string | null;
  acompanhantes?: unknown;
};

type CriancaAlerta = {
  nome: string;
  idade: string | null;
};

function isVoluntarioNome(nome: string) {
  return /^volunt[aá]rio$/i.test(nome.trim());
}

/** Retorna motivos de dados incompletos para exibir alerta na criança. */
export function alertasCrianca(familia: FamiliaAlerta, crianca: CriancaAlerta) {
  const motivos: string[] = [];

  if (isVoluntarioNome(familia.nome) || !familia.ehColaborador) {
    motivos.push("Sem colaborador definido");
  }

  if (!familia.telefone?.trim()) {
    motivos.push("Telefone do responsável ausente");
  }

  if (familia.ehColaborador && !isVoluntarioNome(familia.nome) && !familia.area?.trim()) {
    motivos.push("Área do colaborador ausente");
  }

  if (!crianca.idade?.trim()) {
    motivos.push("Idade não informada");
  }

  return motivos;
}

export function familiaTemAlerta(familia: FamiliaAlerta & { criancas: CriancaAlerta[] }) {
  return familia.criancas.some((c) => alertasCrianca(familia, c).length > 0);
}

export function resumoAcompanhantes(value: unknown) {
  return parseAcompanhantes(value);
}
