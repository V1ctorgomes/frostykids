"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createFamiliaAction,
  updateFamiliaAction,
} from "@/actions/familia";
import { undoCheckinCriancaAction } from "@/actions/checkin";
import type { CriancaInput, FamiliaFormData } from "@/lib/types";
import { formatDateTime } from "@/lib/timezone";

type Props = {
  mode: "create" | "edit";
  initial?: FamiliaFormData;
};

function blankChild(): CriancaInput {
  return { nome: "", idade: "", presente: false };
}

export function FamiliaForm({ mode, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const [form, setForm] = useState<FamiliaFormData>(
    initial ?? {
      nome: "",
      area: "",
      telefone: "",
      acompanhantes: [],
      criancas: [blankChild()],
    },
  );

  function updateField<K extends keyof FamiliaFormData>(key: K, value: FamiliaFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateCrianca(index: number, patch: Partial<CriancaInput>) {
    setForm((prev) => ({
      ...prev,
      criancas: prev.criancas.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));
  }

  function addCrianca() {
    setForm((prev) => ({
      ...prev,
      criancas: [...prev.criancas, blankChild()],
    }));
  }

  function addAcompanhante() {
    setForm((prev) => ({
      ...prev,
      acompanhantes: [...prev.acompanhantes, ""],
    }));
  }

  function updateAcompanhante(index: number, value: string) {
    setForm((prev) => ({
      ...prev,
      acompanhantes: prev.acompanhantes.map((nome, i) => (i === index ? value : nome)),
    }));
  }

  function removeAcompanhante(index: number) {
    const nome = form.acompanhantes[index]?.trim();
    if (nome && !confirm(`Remover acompanhante ${nome}?`)) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      acompanhantes: prev.acompanhantes.filter((_, i) => i !== index),
    }));
  }

  function removeCrianca(index: number) {
    const crianca = form.criancas[index];
    if (!crianca) return;

    if (crianca.presente) {
      setError(
        "Não é possível remover uma criança com presença registrada. Desfaça o check-in antes.",
      );
      return;
    }

    if (crianca.nome.trim() || crianca.id) {
      if (!confirm(`Remover ${crianca.nome || "esta criança"} do cadastro?`)) {
        return;
      }
    }

    setForm((prev) => {
      const next = [...prev.criancas];
      const target = next[index];
      if (target?.id) {
        next[index] = { ...target, _delete: true };
      } else {
        next.splice(index, 1);
      }
      if (next.filter((c) => !c._delete).length === 0) {
        next.push(blankChild());
      }
      return { ...prev, criancas: next };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setConflict(false);

    startTransition(async () => {
      if (mode === "create") {
        const result = await createFamiliaAction(form);
        if (!result.ok) {
          setError(result.error);
          setConflict(Boolean(result.conflict));
          return;
        }
        setSuccess(result.message ?? "Salvo.");
        if (result.data?.id) {
          router.push(`/cadastro/${result.data.id}`);
          router.refresh();
        }
        return;
      }

      const result = await updateFamiliaAction(form);
      if (!result.ok) {
        setError(result.error);
        setConflict(Boolean(result.conflict));
        return;
      }

      setSuccess(result.message ?? "Salvo.");
      if (result.data) {
        const next = result.data;
        setForm((prev) => ({
          ...prev,
          version: next.version,
          acompanhantes: next.acompanhantes,
          criancas: next.criancas.map((serverChild) => ({
            id: serverChild.id,
            nome: serverChild.nome,
            idade: serverChild.idade,
            version: serverChild.version,
            presente: serverChild.presente,
            checkinEm: serverChild.checkinEm,
          })),
        }));
      }

      router.refresh();
    });
  }

  function handleUndoCheckin(crianca: CriancaInput) {
    if (!crianca.id || crianca.version === undefined) return;
    if (!confirm(`Desfazer o check-in de ${crianca.nome}?`)) return;

    setError(null);
    startTransition(async () => {
      const result = await undoCheckinCriancaAction(crianca.id!, crianca.version!);
      if (!result.ok) {
        setError(result.error);
        setConflict(Boolean(result.conflict));
        return;
      }
      setForm((prev) => ({
        ...prev,
        criancas: prev.criancas.map((c) =>
          c.id === crianca.id
            ? {
                ...c,
                presente: false,
                checkinEm: null,
                version: (c.version ?? 0) + 1,
              }
            : c,
        ),
      }));
      router.refresh();
    });
  }

  const visibleChildren = form.criancas
    .map((c, index) => ({ c, index }))
    .filter(({ c }) => !c._delete);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-20">
      <section className="surface p-4">
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--brand-blue)]">
          Responsável
        </h2>
        <div className="grid gap-3">
          <div>
            <label className="label" htmlFor="nome">
              Nome completo *
            </label>
            <input
              id="nome"
              className="field"
              value={form.nome}
              onChange={(e) => updateField("nome", e.target.value)}
              required
              disabled={pending}
            />
          </div>
          <div className="grid gap-3">
            <div>
              <label className="label" htmlFor="area">
                Área / setor
              </label>
              <input
                id="area"
                className="field"
                value={form.area}
                onChange={(e) => updateField("area", e.target.value)}
                disabled={pending}
              />
            </div>
            <div>
              <label className="label" htmlFor="telefone">
                Telefone / WhatsApp
              </label>
              <input
                id="telefone"
                className="field"
                value={form.telefone}
                onChange={(e) => updateField("telefone", e.target.value)}
                disabled={pending}
                inputMode="tel"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="surface p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--brand-blue)]">
            Acompanhantes ({form.acompanhantes.length})
          </h2>
          <button
            type="button"
            className="btn btn-green px-3.5 text-sm"
            onClick={addAcompanhante}
            disabled={pending}
          >
            + Adicionar
          </button>
        </div>

        {form.acompanhantes.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Nenhum acompanhante. Toque em Adicionar se precisar.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {form.acompanhantes.map((nome, index) => (
              <div
                key={`acomp-${index}`}
                className="rounded-[1rem] border border-[var(--line)] bg-[var(--bg-soft)] p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold text-[var(--muted)]">
                    Acompanhante {index + 1}
                  </span>
                  <button
                    type="button"
                    className="btn btn-danger min-h-10 px-3 text-sm"
                    onClick={() => removeAcompanhante(index)}
                    disabled={pending}
                  >
                    Remover
                  </button>
                </div>
                <label className="label">Nome</label>
                <input
                  className="field"
                  value={nome}
                  onChange={(e) => updateAcompanhante(index, e.target.value)}
                  disabled={pending}
                  placeholder="Nome do acompanhante"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="surface p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--brand-blue)]">
            Crianças ({visibleChildren.length})
          </h2>
          <button
            type="button"
            className="btn btn-green px-3.5 text-sm"
            onClick={addCrianca}
            disabled={pending}
          >
            + Adicionar
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {visibleChildren.map(({ c, index }, displayIndex) => (
            <div
              key={c.id ?? `new-${index}`}
              className="rounded-[1rem] border border-[var(--line)] bg-[var(--bg-soft)] p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-extrabold text-[var(--muted)]">
                  Criança {displayIndex + 1}
                </span>
                <div className="flex items-center gap-2">
                  {c.presente && (
                    <span className="badge badge-present">Presente</span>
                  )}
                  <button
                    type="button"
                    className="btn btn-danger min-h-10 px-3 text-sm"
                    onClick={() => removeCrianca(index)}
                    disabled={pending}
                  >
                    Remover
                  </button>
                </div>
              </div>

              <div className="grid gap-3">
                <div>
                  <label className="label">Nome completo *</label>
                  <input
                    className="field"
                    value={c.nome}
                    onChange={(e) => updateCrianca(index, { nome: e.target.value })}
                    required={!c._delete}
                    disabled={pending}
                  />
                </div>
                <div>
                  <label className="label">Idade</label>
                  <input
                    className="field"
                    value={c.idade}
                    onChange={(e) => updateCrianca(index, { idade: e.target.value })}
                    placeholder="Ex: 1 ano e 6 meses"
                    disabled={pending}
                  />
                </div>
                {c.presente && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-[var(--muted)]">
                      Check-in: {formatDateTime(c.checkinEm)}
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary text-sm"
                      onClick={() => handleUndoCheckin(c)}
                      disabled={pending}
                    >
                      Desfazer check-in
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {error && (
        <div className="rounded-[1rem] bg-[var(--danger-bg)] px-4 py-3 text-sm font-bold text-[var(--danger)]">
          <p>{error}</p>
          {conflict && (
            <button
              type="button"
              className="mt-2 font-extrabold underline"
              onClick={() => router.refresh()}
            >
              Atualizar dados do servidor
            </button>
          )}
        </div>
      )}

      {success && (
        <p className="rounded-[1rem] bg-[var(--present-bg)] px-4 py-3 text-sm font-bold text-[var(--present)]">
          {success}
        </p>
      )}

      <div className="dock !grid-cols-[1fr_1.6fr]">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.push("/controle")}
          disabled={pending}
        >
          Voltar
        </button>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
