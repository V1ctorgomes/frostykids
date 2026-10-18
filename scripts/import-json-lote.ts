/**
 * Importa o lote JSON gerado a partir da planilha do evento.
 *
 * Uso:
 *   npx tsx scripts/import-json-lote.ts ./dados/controle-kids-importacao.json
 *
 * Idempotente via importKey = origem_ref.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type FamiliaLote = {
  origem_ref: string;
  responsavel: {
    nome: string;
    area: string | null;
    telefone: string | null;
    acompanhante01: string | null;
    acompanhante02: string | null;
    dataInscricao_original: string | null;
  };
  criancas: { nome: string; idade: string | null }[];
};

type Lote = {
  lote_importacao: string;
  familias: FamiliaLote[];
};

function isVoluntario(nome: string) {
  return /^volunt[aá]rio$/i.test(nome.trim());
}

function parseDataBr(value: string | null) {
  if (!value) return null;
  const match = value.trim().match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/,
  );
  if (!match) return null;

  const [, dd, mm, yyyy, hh = "00", min = "00", ss = "00"] = match;
  // Interpreta como horário de Fortaleza (UTC-3) e grava em UTC.
  const iso = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}-03:00`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function acompanhantesFrom(resp: FamiliaLote["responsavel"]) {
  const list: { nome: string; telefone: string | null }[] = [];
  for (const nome of [resp.acompanhante01, resp.acompanhante02]) {
    if (nome && nome.trim()) {
      list.push({ nome: nome.trim(), telefone: null });
    }
  }
  return list;
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error(
      "Uso: npx tsx scripts/import-json-lote.ts ./dados/controle-kids-importacao.json",
    );
    process.exit(1);
  }

  const filePath = resolve(fileArg);
  const lote = JSON.parse(readFileSync(filePath, "utf8")) as Lote;

  let created = 0;
  let skipped = 0;
  let childrenCreated = 0;
  let voluntarios = 0;

  for (const familia of lote.familias) {
    const importKey = familia.origem_ref;
    const existing = await prisma.responsavel.findUnique({
      where: { importKey },
      select: { id: true },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    const resp = familia.responsavel;
    const voluntario = isVoluntario(resp.nome);
    if (voluntario) voluntarios += 1;

    const criancas = (familia.criancas ?? []).filter((c) => c.nome?.trim());

    await prisma.responsavel.create({
      data: {
        nome: resp.nome.trim(),
        ehColaborador: !voluntario,
        area: voluntario ? null : resp.area?.trim() || null,
        telefone: resp.telefone?.trim() || null,
        acompanhantes: acompanhantesFrom(resp),
        dataInscricao: parseDataBr(resp.dataInscricao_original),
        importKey,
        version: 0,
        criancas: {
          create: criancas.map((c) => ({
            nome: c.nome.trim(),
            idade: c.idade?.trim() || null,
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

  console.log(`Lote: ${lote.lote_importacao}`);
  console.log(`Criados agora: ${created} responsáveis · ${childrenCreated} crianças`);
  console.log(`Ignorados (já existiam): ${skipped}`);
  console.log(`Marcados como sem vínculo (VOLUNTARIO): ${voluntarios}`);
  console.log(`Totais no banco: ${totalResp} responsáveis · ${totalKids} crianças`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
