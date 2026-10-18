import { prisma } from "@/lib/prisma";

const familiaInclude = {
  criancas: {
    orderBy: { createdAt: "asc" as const },
  },
};

export async function getTotais() {
  const [totalCriancas, totalPresentes] = await Promise.all([
    prisma.crianca.count(),
    prisma.crianca.count({ where: { presente: true } }),
  ]);

  return {
    totalCriancas,
    totalPresentes,
    totalPendentes: totalCriancas - totalPresentes,
  };
}

export async function searchFamilias(q: string) {
  const termo = q.trim();

  if (!termo) {
    return prisma.responsavel.findMany({
      include: familiaInclude,
      orderBy: { nome: "asc" },
    });
  }

  const like = `%${termo}%`;
  const matches = await prisma.$queryRaw<{ id: string }[]>`
    SELECT DISTINCT r.id
    FROM "Responsavel" r
    LEFT JOIN "Crianca" c ON c."responsavelId" = r.id
    WHERE r.nome ILIKE ${like}
       OR COALESCE(r.telefone, '') ILIKE ${like}
       OR COALESCE(r.area, '') ILIKE ${like}
       OR c.nome ILIKE ${like}
       OR EXISTS (
         SELECT 1
         FROM jsonb_array_elements(
           CASE
             WHEN jsonb_typeof(r.acompanhantes::jsonb) = 'array' THEN r.acompanhantes::jsonb
             ELSE '[]'::jsonb
           END
         ) AS elem
         WHERE COALESCE(elem->>'nome', '') ILIKE ${like}
            OR COALESCE(elem->>'telefone', '') ILIKE ${like}
       )
  `;

  const ids = matches.map((row) => row.id);
  if (ids.length === 0) {
    return [];
  }

  return prisma.responsavel.findMany({
    where: { id: { in: ids } },
    include: familiaInclude,
    orderBy: { nome: "asc" },
  });
}
