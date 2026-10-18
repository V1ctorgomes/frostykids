import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { FamiliaForm } from "@/components/FamiliaForm";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseAcompanhantes } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarCadastroPage({ params }: Props) {
  await requireAuth();
  const { id } = await params;

  const familia = await prisma.responsavel.findUnique({
    where: { id },
    include: {
      criancas: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!familia) {
    notFound();
  }

  return (
    <main className="page page-flush">
      <header className="topbar">
        <BrandMark size="xs" />
        <Link href="/controle" className="btn btn-ghost">
          Voltar
        </Link>
      </header>
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-[1.65rem] font-semibold text-[var(--brand-blue)]">
        Editar cadastro
      </h1>
      <p className="mb-4 text-sm text-[var(--muted)]">{familia.nome}</p>

      <FamiliaForm
        mode="edit"
        initial={{
          id: familia.id,
          nome: familia.nome,
          ehColaborador: familia.ehColaborador,
          area: familia.area ?? "",
          telefone: familia.telefone ?? "",
          acompanhantes: parseAcompanhantes(familia.acompanhantes),
          version: familia.version,
          criancas: familia.criancas.map((c) => ({
            id: c.id,
            nome: c.nome,
            idade: c.idade ?? "",
            version: c.version,
            presente: c.presente,
            checkinEm: c.checkinEm?.toISOString() ?? null,
          })),
        }}
      />
    </main>
  );
}
