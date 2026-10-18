import Link from "next/link";
import { CheckinButtons } from "@/components/CheckinButtons";
import { alertasCrianca } from "@/lib/alertas";
import { formatIdadeDisplay } from "@/lib/idade";
import { formatTelefoneDisplay } from "@/lib/telefone";
import { formatDateTime } from "@/lib/timezone";
import { parseAcompanhantes } from "@/lib/types";

type Crianca = {
  id: string;
  nome: string;
  idade: string | null;
  presente: boolean;
  checkinEm: Date | null;
  version: number;
};

type Props = {
  id: string;
  nome: string;
  ehColaborador: boolean;
  area: string | null;
  telefone: string | null;
  acompanhantes: unknown;
  criancas: Crianca[];
};

function AlertaBadge({ motivos }: { motivos: string[] }) {
  if (motivos.length === 0) return null;

  return (
    <span
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--danger)] text-[0.7rem] font-black text-white"
      title={motivos.join(" · ")}
      aria-label={`Atenção: ${motivos.join(", ")}`}
    >
      !
    </span>
  );
}

export function FamiliaCard({
  id,
  nome,
  ehColaborador,
  area,
  telefone,
  acompanhantes,
  criancas,
}: Props) {
  const presentes = criancas.filter((c) => c.presente).length;
  const acompList = parseAcompanhantes(acompanhantes);
  const familiaBase = { nome, ehColaborador, area, telefone };

  return (
    <article className="surface p-3.5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span
              className={`badge ${ehColaborador ? "badge-present" : "badge-pending"}`}
            >
              {ehColaborador ? "Colaborador" : "Sem vínculo"}
            </span>
          </div>
          <h2 className="truncate font-[family-name:var(--font-display)] text-[1.15rem] font-semibold leading-tight">
            {nome.trim() || "Sem colaborador"}
          </h2>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {[ehColaborador ? area : null, formatTelefoneDisplay(telefone)]
              .filter(Boolean)
              .join(" · ") || "Sem área/telefone"}
          </p>
          {acompList.length > 0 && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Acomp.:{" "}
              {acompList
                .map((a) => {
                  const tel = formatTelefoneDisplay(a.telefone);
                  return tel ? `${a.nome} (${tel})` : a.nome;
                })
                .join(" · ")}
            </p>
          )}
          <p className="mt-1 text-xs font-extrabold text-[var(--brand-blue)]">
            {presentes}/{criancas.length} presentes
          </p>
        </div>
        <Link
          href={`/cadastro/${id}`}
          className="btn btn-secondary shrink-0 px-3.5 text-sm"
        >
          Editar
        </Link>
      </div>

      <ul className="flex flex-col gap-2">
        {criancas.map((crianca) => {
          const motivos = alertasCrianca(familiaBase, crianca);

          return (
            <li
              key={crianca.id}
              className={`flex items-center justify-between gap-2 rounded-[1rem] px-3 py-2.5 ${
                motivos.length > 0
                  ? "border border-[#f5c2c2] bg-[var(--danger-bg)]"
                  : "bg-[var(--bg-soft)]"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <AlertaBadge motivos={motivos} />
                  <span className="font-extrabold leading-tight">{crianca.nome}</span>
                  <span
                    className={`badge ${crianca.presente ? "badge-present" : "badge-pending"}`}
                  >
                    {crianca.presente ? "Presente" : "Pendente"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {formatIdadeDisplay(crianca.idade)}
                  {crianca.presente && crianca.checkinEm
                    ? ` · ${formatDateTime(crianca.checkinEm)}`
                    : ""}
                </p>
                {motivos.length > 0 && (
                  <p className="mt-1 text-[0.68rem] font-bold leading-snug text-[var(--danger)]">
                    {motivos.join(" · ")}
                  </p>
                )}
              </div>
              <CheckinButtons
                criancaId={crianca.id}
                version={crianca.version}
                presente={crianca.presente}
                nome={crianca.nome}
              />
            </li>
          );
        })}
      </ul>
    </article>
  );
}
