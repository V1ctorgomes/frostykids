import * as XLSX from "xlsx";
import { formatIdadeDisplay } from "@/lib/idade";
import { prisma } from "@/lib/prisma";
import { formatTelefoneDisplay } from "@/lib/telefone";
import { parseAcompanhantes } from "@/lib/types";

function formatAcompanhantes(value: unknown) {
  const list = parseAcompanhantes(value);
  if (list.length === 0) return "";

  return list
    .map((item) => {
      const tel = formatTelefoneDisplay(item.telefone);
      return tel ? `${item.nome} (${tel})` : item.nome;
    })
    .join(" · ");
}

export async function buildPresencaWorkbook() {
  const familias = await prisma.responsavel.findMany({
    include: {
      criancas: {
        orderBy: [{ nome: "asc" }],
      },
    },
    orderBy: { nome: "asc" },
  });

  const rows = familias.flatMap((familia) =>
    familia.criancas.map((crianca) => ({
      Criança: crianca.nome,
      Idade:
        formatIdadeDisplay(crianca.idade) === "Idade não informada"
          ? ""
          : formatIdadeDisplay(crianca.idade),
      Colaborador: familia.nome.trim() || "Sem colaborador",
      Contato: formatTelefoneDisplay(familia.telefone) ?? "",
      Acompanhante: formatAcompanhantes(familia.acompanhantes),
      Status: crianca.presente ? "Presente" : "Pendente",
      "Check-in em": crianca.checkinEm
        ? new Intl.DateTimeFormat("pt-BR", {
            timeZone: "America/Fortaleza",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(crianca.checkinEm)
        : "",
    })),
  );

  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: [
      "Criança",
      "Idade",
      "Colaborador",
      "Contato",
      "Acompanhante",
      "Status",
      "Check-in em",
    ],
  });

  sheet["!cols"] = [
    { wch: 28 },
    { wch: 14 },
    { wch: 28 },
    { wch: 18 },
    { wch: 36 },
    { wch: 12 },
    { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Presença");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;

  return buffer;
}

export function exportFileName() {
  const stamp = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date())
    .replace(/[^\d]/g, "-");

  return `frosty-kids-presenca-${stamp}.xlsx`;
}
