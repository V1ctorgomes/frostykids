/**
 * Importa a planilha Excel do evento para o banco.
 *
 * Uso:
 *   npx tsx scripts/import-planilha.ts ./dados/inscricoes.xlsx
 *
 * Colunas esperadas (nomes flexíveis):
 *   Colaborador, Área, Telefone, Acompanhante 01, Acompanhante 02,
 *   Filho(a) 01..04, Idade 01..04 (ou variações), Data de resposta
 *
 * Reexecução é segura: usa importKey para evitar duplicatas.
 */

import { createHash } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Row = Record<string, unknown>;

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function cell(row: Row, ...candidates: string[]) {
  const entries = Object.entries(row);
  for (const candidate of candidates) {
    const target = normalizeHeader(candidate);
    for (const [key, value] of entries) {
      if (normalizeHeader(String(key)) === target) {
        if (value === null || value === undefined) return "";
        if (value instanceof Date) return value.toISOString();
        return String(value).trim();
      }
    }
  }
  return "";
}

function parseDate(value: string) {
  if (!value) return null;

  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && value !== "") {
    // Excel serial date
    const parsed = XLSX.SSF.parse_date_code(asNumber);
    if (parsed) {
      return new Date(
        Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S),
      );
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function importKeyFor(nome: string, telefone: string, dataInscricao: Date | null) {
  const raw = [
    nome.toLowerCase(),
    telefone.replace(/\D/g, ""),
    dataInscricao?.toISOString() ?? "",
  ].join("|");
  return createHash("sha256").update(raw).digest("hex");
}

function childrenFromRow(row: Row) {
  const children: { nome: string; idade: string | null }[] = [];

  for (let i = 1; i <= 4; i++) {
    const nome = cell(
      row,
      `Filho(a) 0${i}`,
      `Filho(a) ${i}`,
      `Filho ${i}`,
      `Filha ${i}`,
      `Criança 0${i}`,
      `Crianca 0${i}`,
    );
    if (!nome) continue;

    const idade =
      cell(
        row,
        `Idade 0${i}`,
        `Idade ${i}`,
        `Idade Filho(a) 0${i}`,
        `Idade do Filho(a) 0${i}`,
      ) || null;

    children.push({ nome, idade });
  }

  return children;
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error("Informe o caminho da planilha: npx tsx scripts/import-planilha.ts ./arquivo.xlsx");
    process.exit(1);
  }

  const filePath = resolve(fileArg);
  const buffer = readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });

  console.log(`Planilha: ${filePath}`);
  console.log(`Aba: ${sheetName} · Linhas: ${rows.length}`);

  let created = 0;
  let skipped = 0;
  let childrenCreated = 0;

  for (const row of rows) {
    const nome = cell(row, "Colaborador", "Responsável", "Responsavel", "Nome");
    if (!nome) {
      skipped += 1;
      continue;
    }

    const area = cell(row, "Área", "Area", "Setor") || null;
    const telefone = cell(row, "Telefone", "WhatsApp", "Telefone / WhatsApp") || null;
    const acompanhantes: string[] = [];
    for (let i = 1; i <= 10; i++) {
      const acomp = cell(
        row,
        `Acompanhante 0${i}`,
        `Acompanhante ${i}`,
        `Acompanhante0${i}`,
      );
      if (acomp) acompanhantes.push(acomp);
    }
    const dataInscricao = parseDate(
      cell(row, "Data de resposta", "Data", "Carimbo de data/hora"),
    );
    const importKey = importKeyFor(nome, telefone ?? "", dataInscricao);
    const criancas = childrenFromRow(row);

    const existing = await prisma.responsavel.findUnique({
      where: { importKey },
      select: { id: true },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.responsavel.create({
      data: {
        nome,
        area,
        telefone,
        acompanhantes,
        dataInscricao,
        importKey,
        criancas: {
          create: criancas.map((c) => ({
            nome: c.nome,
            idade: c.idade,
            presente: false,
          })),
        },
      },
    });

    created += 1;
    childrenCreated += criancas.length;
  }

  console.log(`Importados: ${created} responsáveis · ${childrenCreated} crianças`);
  console.log(`Ignorados (já existentes ou vazios): ${skipped}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
