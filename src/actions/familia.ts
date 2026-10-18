"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult, FamiliaFormData } from "@/lib/types";

function emptyToNull(value: string | undefined | null) {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeAcompanhantes(list: string[] | undefined) {
  return (list ?? [])
    .map((nome) => nome.trim())
    .filter((nome) => nome.length > 0);
}

function validateForm(data: FamiliaFormData, isCreate: boolean) {
  if (!data.nome.trim()) {
    return "Nome do responsável é obrigatório.";
  }

  const criancasAtivas = data.criancas.filter((c) => !c._delete && c.nome.trim());

  if (isCreate && criancasAtivas.length === 0) {
    return "Informe pelo menos uma criança.";
  }

  if (!isCreate) {
    const remaining = data.criancas.filter((c) => {
      if (c._delete) return false;
      return c.nome.trim().length > 0;
    });
    if (remaining.length === 0) {
      return "O cadastro precisa ter pelo menos uma criança.";
    }
  }

  for (const crianca of data.criancas) {
    if (crianca._delete && crianca.presente) {
      return `Não é possível remover "${crianca.nome}" com presença registrada. Desfaça o check-in antes.`;
    }
  }

  return null;
}

export async function createFamiliaAction(
  data: FamiliaFormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAuth();
  } catch {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }

  const validationError = validateForm(data, true);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  try {
    const criancas = data.criancas
      .filter((c) => !c._delete && c.nome.trim())
      .map((c) => ({
        nome: c.nome.trim(),
        idade: emptyToNull(c.idade),
        presente: false,
      }));

    const created = await prisma.responsavel.create({
      data: {
        nome: data.nome.trim(),
        area: emptyToNull(data.area),
        telefone: emptyToNull(data.telefone),
        acompanhantes: normalizeAcompanhantes(data.acompanhantes),
        criancas: { create: criancas },
      },
      select: { id: true },
    });

    revalidatePath("/controle");
    return { ok: true, data: { id: created.id }, message: "Família cadastrada." };
  } catch {
    return {
      ok: false,
      error: "Não foi possível salvar o cadastro. Tente novamente.",
    };
  }
}

export async function updateFamiliaAction(
  data: FamiliaFormData,
): Promise<
  ActionResult<{
    id: string;
    version: number;
    acompanhantes: string[];
    criancas: {
      id: string;
      nome: string;
      idade: string;
      version: number;
      presente: boolean;
      checkinEm: string | null;
    }[];
  }>
> {
  try {
    await requireAuth();
  } catch {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }

  if (!data.id) {
    return { ok: false, error: "Cadastro inválido." };
  }

  const validationError = validateForm(data, false);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const responsavelId = data.id;
  const expectedVersion = data.version ?? 0;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.responsavel.updateMany({
        where: { id: responsavelId, version: expectedVersion },
        data: {
          nome: data.nome.trim(),
          area: emptyToNull(data.area),
          telefone: emptyToNull(data.telefone),
          acompanhantes: normalizeAcompanhantes(data.acompanhantes),
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        return { conflict: true as const };
      }

      for (const crianca of data.criancas) {
        if (crianca._delete && crianca.id) {
          if (crianca.presente) {
            throw new Error("DELETE_PRESENT");
          }

          const removed = await tx.crianca.deleteMany({
            where: {
              id: crianca.id,
              responsavelId,
              presente: false,
            },
          });

          if (removed.count === 0) {
            throw new Error("DELETE_CONFLICT");
          }
          continue;
        }

        if (!crianca.nome.trim()) {
          continue;
        }

        if (crianca.id) {
          const childUpdated = await tx.crianca.updateMany({
            where: {
              id: crianca.id,
              responsavelId,
              version: crianca.version ?? 0,
            },
            data: {
              nome: crianca.nome.trim(),
              idade: emptyToNull(crianca.idade),
              version: { increment: 1 },
            },
          });

          if (childUpdated.count === 0) {
            return { conflict: true as const };
          }
        } else {
          await tx.crianca.create({
            data: {
              responsavelId,
              nome: crianca.nome.trim(),
              idade: emptyToNull(crianca.idade),
              presente: false,
            },
          });
        }
      }

      return { conflict: false as const };
    });

    if (result.conflict) {
      return {
        ok: false,
        conflict: true,
        error:
          "Este cadastro foi alterado por outro operador. Atualize os dados antes de salvar novamente.",
      };
    }

    const atualizado = await prisma.responsavel.findUnique({
      where: { id: responsavelId },
      include: { criancas: { orderBy: { createdAt: "asc" } } },
    });

    revalidatePath("/controle");
    revalidatePath(`/cadastro/${responsavelId}`);
    return {
      ok: true,
      data: {
        id: responsavelId,
        version: atualizado?.version ?? expectedVersion + 1,
        acompanhantes: atualizado?.acompanhantes ?? [],
        criancas:
          atualizado?.criancas.map((c) => ({
            id: c.id,
            nome: c.nome,
            idade: c.idade ?? "",
            version: c.version,
            presente: c.presente,
            checkinEm: c.checkinEm?.toISOString() ?? null,
          })) ?? [],
      },
      message: "Cadastro atualizado.",
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "DELETE_PRESENT") {
        return {
          ok: false,
          error:
            "Não é possível remover uma criança com presença registrada. Desfaça o check-in antes.",
        };
      }
      if (error.message === "DELETE_CONFLICT") {
        return {
          ok: false,
          conflict: true,
          error:
            "Este cadastro foi alterado por outro operador. Atualize os dados antes de salvar novamente.",
        };
      }
    }

    return {
      ok: false,
      error: "Não foi possível salvar o cadastro. Tente novamente.",
    };
  }
}

export async function getFamiliaAction(id: string) {
  await requireAuth();

  return prisma.responsavel.findUnique({
    where: { id },
    include: {
      criancas: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}
