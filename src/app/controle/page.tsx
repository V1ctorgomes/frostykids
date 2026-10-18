import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { BrandMark } from "@/components/BrandMark";
import { FamiliaCard } from "@/components/FamiliaCard";
import { getTotais, searchFamilias } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function ControlePage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const [totais, familias] = await Promise.all([getTotais(), searchFamilias(q)]);

  return (
    <main className="page">
      <header className="topbar">
        <BrandMark size="xs" />
        <form action={logoutAction}>
          <button type="submit" className="btn btn-secondary px-4 text-sm">
            Sair
          </button>
        </form>
      </header>

      <h1 className="mb-3 font-[family-name:var(--font-display)] text-[1.65rem] font-semibold leading-none text-[var(--brand-blue)]">
        Controle de crianças
      </h1>

      <section className="stats">
        <div className="stat">
          <strong>{totais.totalCriancas}</strong>
          <span>Total</span>
        </div>
        <div className="stat">
          <strong className="text-[var(--present)]">{totais.totalPresentes}</strong>
          <span>Presentes</span>
        </div>
        <div className="stat">
          <strong className="text-[var(--pending)]">{totais.totalPendentes}</strong>
          <span>Pendentes</span>
        </div>
      </section>

      <form className="mb-3" action="/controle" method="get">
        <label className="label" htmlFor="q">
          Buscar
        </label>
        <div className="flex gap-2">
          <input
            id="q"
            name="q"
            defaultValue={q}
            className="field"
            placeholder="Nome ou telefone"
            enterKeyHint="search"
            autoComplete="off"
            autoCapitalize="off"
          />
          <button type="submit" className="btn btn-primary shrink-0 px-4">
            Ir
          </button>
        </div>
      </form>

      {q && (
        <p className="mb-3 text-sm text-[var(--muted)]">
          {familias.length} resultado{familias.length === 1 ? "" : "s"} para “{q}”
          {" · "}
          <Link href="/controle" className="font-bold text-[var(--brand-blue)]">
            Limpar
          </Link>
        </p>
      )}

      {familias.length === 0 ? (
        <div className="surface p-7 text-center text-[var(--muted)]">
          {q
            ? "Nenhum cadastro encontrado."
            : "Nenhuma família cadastrada ainda."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {familias.map((familia) => (
            <FamiliaCard
              key={familia.id}
              id={familia.id}
              nome={familia.nome}
              ehColaborador={familia.ehColaborador}
              area={familia.area}
              telefone={familia.telefone}
              acompanhantes={familia.acompanhantes}
              criancas={familia.criancas}
            />
          ))}
        </div>
      )}

      <nav className="dock" aria-label="Ações rápidas">
        <Link href="/controle" className="btn btn-secondary">
          Atualizar
        </Link>
        <Link href="/cadastro" className="btn btn-green">
          + Nova família
        </Link>
      </nav>
    </main>
  );
}
