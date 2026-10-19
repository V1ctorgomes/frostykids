import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { BrandMark } from "@/components/BrandMark";
import { FamiliaCard } from "@/components/FamiliaCard";
import { firstLetterKey } from "@/lib/idade";
import { getTotais, searchFamilias } from "@/lib/queries";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 5;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

type Props = {
  searchParams: Promise<{ q?: string; letra?: string; page?: string }>;
};

function buildHref(params: { q?: string; letra?: string; page?: number }) {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  // Com busca ativa, letra não entra — evita esconder "Luiz Wagner" na letra W
  if (!params.q?.trim() && params.letra && params.letra !== "TODOS") {
    sp.set("letra", params.letra);
  }
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/controle?${qs}` : "/controle";
}

export default async function ControlePage({ searchParams }: Props) {
  const { q = "", letra: letraRaw = "TODOS", page: pageRaw = "1" } =
    await searchParams;

  const buscando = q.trim().length > 0;
  const letra = buscando
    ? "TODOS"
    : letraRaw.trim().toUpperCase() || "TODOS";
  const pageRequested = Math.max(1, Number.parseInt(pageRaw, 10) || 1);

  const [totais, familias] = await Promise.all([getTotais(), searchFamilias(q)]);

  const filtradas =
    letra === "TODOS"
      ? familias
      : familias.filter((f) => firstLetterKey(f.nome) === letra);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const page = Math.min(pageRequested, totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = filtradas.slice(start, start + PAGE_SIZE);

  const lettersPresent = new Set(
    (buscando ? [] : familias).map((f) => firstLetterKey(f.nome)),
  );

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
            placeholder="Criança, responsável, telefone…"
            enterKeyHint="search"
            autoComplete="off"
            autoCapitalize="off"
          />
          <button type="submit" className="btn btn-primary shrink-0 px-4">
            Ir
          </button>
        </div>
        <p className="mt-1.5 text-xs text-[var(--muted)]">
          Busca em qualquer parte do nome (ex.: “wagner” acha “Luiz Wagner”).
        </p>
      </form>

      <section className="mb-3">
        <p className="label">Filtrar por letra do responsável</p>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <Link
            href={buildHref({ letra: "TODOS" })}
            className={`btn shrink-0 px-3 text-sm ${
              !buscando && letra === "TODOS" ? "btn-primary" : "btn-secondary"
            }`}
          >
            Todos
          </Link>
          {LETTERS.map((letter) => {
            const active = !buscando && letra === letter;
            const has = lettersPresent.has(letter);
            return (
              <Link
                key={letter}
                href={buildHref({ letra: letter })}
                className={`btn shrink-0 min-w-11 px-0 text-sm ${
                  active ? "btn-primary" : "btn-secondary"
                } ${buscando || has ? "" : "opacity-40"}`}
              >
                {letter}
              </Link>
            );
          })}
        </div>
        {buscando && (
          <p className="mt-1.5 text-xs text-[var(--muted)]">
            Filtro por letra pausado durante a busca.
          </p>
        )}
      </section>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--muted)]">
          {filtradas.length} família{filtradas.length === 1 ? "" : "s"}
          {!buscando && letra !== "TODOS" ? ` · letra ${letra}` : ""}
          {buscando ? ` · busca “${q.trim()}”` : ""}
          {" · "}ordem A–Z
          {(buscando || letra !== "TODOS") && (
            <>
              {" · "}
              <Link href="/controle" className="font-bold text-[var(--brand-blue)]">
                Limpar filtros
              </Link>
            </>
          )}
        </p>
        <a href="/api/exportar" className="btn btn-secondary px-3.5 text-sm">
          Baixar Excel
        </a>
      </div>

      {pageItems.length === 0 ? (
        <div className="surface p-7 text-center text-[var(--muted)]">
          {buscando || letra !== "TODOS"
            ? "Nenhum cadastro encontrado para este filtro."
            : "Nenhuma família cadastrada ainda."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pageItems.map((familia) => (
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

      {filtradas.length > 0 && (
        <nav
          className="mt-4 mb-2 flex items-center justify-between gap-2"
          aria-label="Paginação"
        >
          {page > 1 ? (
            <Link
              href={buildHref({
                q: buscando ? q : undefined,
                letra,
                page: page - 1,
              })}
              className="btn btn-secondary flex-1"
            >
              Anterior
            </Link>
          ) : (
            <span className="btn btn-secondary flex-1 opacity-40">Anterior</span>
          )}

          <span className="shrink-0 px-2 text-sm font-extrabold text-[var(--muted)]">
            {page}/{totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={buildHref({
                q: buscando ? q : undefined,
                letra,
                page: page + 1,
              })}
              className="btn btn-secondary flex-1"
            >
              Próxima
            </Link>
          ) : (
            <span className="btn btn-secondary flex-1 opacity-40">Próxima</span>
          )}
        </nav>
      )}

      <nav className="dock" aria-label="Ações rápidas">
        <Link
          href={buildHref({
            q: buscando ? q : undefined,
            letra,
            page,
          })}
          className="btn btn-secondary"
        >
          Atualizar
        </Link>
        <Link href="/cadastro" className="btn btn-green">
          + Nova família
        </Link>
      </nav>
    </main>
  );
}
