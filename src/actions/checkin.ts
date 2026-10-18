"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/types";

export async function checkinCriancaAction(
  criancaId: string,
  version: number,
): Promise<ActionResult<{ version: number }>> {
  try {
    await requireAuth();
  } catch {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }

  try {
    const result = await prisma.crianca.updateMany({
      where: {
        id: criancaId,
        version,
        presente: false,
      },
      data: {
        presente: true,
        checkinEm: new Date(),
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      const atual = await prisma.crianca.findUnique({
        where: { id: criancaId },
        select: { presente: true, version: true },
      });

      if (!atual) {
        return { ok: false, error: "Criança não encontrada." };
      }

      if (atual.presente) {
        return {
          ok: false,
          error: "Esta criança já está marcada como presente.",
          conflict: true,
        };
      }

      return {
        ok: false,
        error:
          "Este cadastro foi alterado por outro operador. Atualize os dados antes de salvar novamente.",
        conflict: true,
      };
    }

    revalidatePath("/controle");
    return {
      ok: true,
      data: { version: version + 1 },
      message: "Check-in registrado.",
    };
  } catch {
    return {
      ok: false,
      error: "Não foi possível registrar o check-in. Tente novamente.",
    };
  }
}

export async function undoCheckinCriancaAction(
  criancaId: string,
  version: number,
): Promise<ActionResult<{ version: number }>> {
  try {
    await requireAuth();
  } catch {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }

  try {
    const result = await prisma.crianca.updateMany({
      where: {
        id: criancaId,
        version,
        presente: true,
      },
      data: {
        presente: false,
        checkinEm: null,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      return {
        ok: false,
        error:
          "Este cadastro foi alterado por outro operador. Atualize os dados antes de salvar novamente.",
        conflict: true,
      };
    }

    revalidatePath("/controle");
    revalidatePath(`/cadastro`);
    return {
      ok: true,
      data: { version: version + 1 },
      message: "Check-in desfeito.",
    };
  } catch {
    return {
      ok: false,
      error: "Não foi possível desfazer o check-in. Tente novamente.",
    };
  }
}
