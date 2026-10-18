/**
 * Importa o lote JSON corrigido (formato v2).
 *
 * Uso:
 *   npx tsx scripts/import-json-lote.ts ./dados/controle-kids-importacao.json
 *
 * Flags:
 *   --wipe  apaga todos os cadastros antes de importar
 *
 * Idempotente via importKey = chaveImportacao.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Registro = {
  chaveImportacao: string;
  responsavel: {
    nome: string;
    area: string | null;
    telefone: string | null;
    acompanhante01: string | null;
    acompanhante02: string | null;
    dataInscricao: string | null;
  };
  criancas: { nome: string; idade: string | null }[];
};

type LoteV2 = {
  formato?: string;
  totais?: { responsaveis: number; criancas: number };
  registros: Registro[];
};

function isVoluntario(nome: string) {
  return /^volunt[aá]rio$/i.test(nome.trim());
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeTelefone(value: string | null) {
  const d = digitsOnly(value ?? "");
  return d.length > 0 ? d : null;
}

/** Extrai anos como número (máx. 2 dígitos). Ex.: "08 anos" → "8" */
function normalizeIdade(value: string | null) {
  if (!value?.trim()) return null;
  const match = value.trim().match(/(\d{1,2})/);
  if (!match) return null;
  return String(Number(match[1]));
}

function parseDataInscricao(value: string | null) {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function acompanhantesFrom(resp: Registro["responsavel"]) {
  const list: { nome: string; telefone: string | null }[] = [];
  for (const nome of [resp.acompanhante01, resp.acompanhante02]) {
    if (nome?.trim()) {
      list.push({ nome: nome.trim(), telefone: null });
    }
  }
  return list;
}

async function wipeAll() {
  await prisma.$transaction([
    prisma.crianca.deleteMany(),
    prisma.responsavel.deleteMany(),
  ]);
  console.log("Banco limpo (responsáveis e crianças removidos).");
}

async function main() {
  const args = process.argv.slice(2);
  const wipe = args.includes("--wipe");
  const fileArg = args.find((a) => !a.startsWith("--"));

  if (!fileArg) {
    console.error(
      "Uso: npx tsx scripts/import-json-lote.ts ./dados/controle-kids-importacao.json [--wipe]",
    );
    process.exit(1);
  }

  if (wipe) {
    await wipeAll();
  }

  const filePath = resolve(fileArg);
  const lote = JSON.parse(readFileSync(filePath, "utf8")) as LoteV2;
  const registros = lote.registros ?? [];

  let created = 0;
  let skipped = 0;
  let childrenCreated = 0;
  let voluntarios = 0;

  for (const registro of registros) {
    const importKey = registro.chaveImportacao;
    const existing = await prisma.responsavel.findUnique({
      where: { importKey },
      select: { id: true },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    const resp = registro.responsavel;
    const voluntario = isVoluntario(resp.nome);
    if (voluntario) voluntarios += 1;

    const criancas = (registro.criancas ?? []).filter((c) => c.nome?.trim());

    await prisma.responsavel.create({
      data: {
        // VOLUNTARIO → nome vazio + sem vínculo
        nome: voluntario ? "" : resp.nome.trim(),
        ehColaborador: !voluntario,
        area: voluntario ? null : resp.area?.trim() || null,
        telefone: normalizeTelefone(resp.telefone),
        acompanhantes: acompanhantesFrom(resp),
        dataInscricao: parseDataInscricao(resp.dataInscricao),
        importKey,
        version: 0,
        criancas: {
          create: criancas.map((c) => ({
            nome: c.nome.trim(),
            idade: normalizeIdade(c.idade),
            presente: false,
            checkinEm: null,
            version: 0,
          })),
        },
      },
    });

    created += 1;
    childrenCreated += criancas.length;
  }

  const [totalResp, totalKids] = await Promise.all([
    prisma.responsavel.count(),
    prisma.crianca.count(),
  ]);

  console.log(`Formato: ${lote.formato ?? "desconhecido"}`);
  console.log(`Criados agora: ${created} responsáveis · ${childrenCreated} crianças`);
  console.log(`Ignorados (já existiam): ${skipped}`);
  console.log(`Sem vínculo (VOLUNTARIO → nome vazio): ${voluntarios}`);
  console.log(`Totais no banco: ${totalResp} responsáveis · ${totalKids} crianças`);
  if (lote.totais) {
    console.log(
      `Esperado no lote: ${lote.totais.responsaveis} responsáveis · ${lote.totais.criancas} crianças`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
