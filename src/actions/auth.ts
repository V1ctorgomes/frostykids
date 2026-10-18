"use server";

import { redirect } from "next/navigation";
import {
  authConfigError,
  createSession,
  destroySession,
  verifyPassword,
} from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const configError = authConfigError();
  if (configError) {
    return { ok: false, error: configError };
  }

  const password = String(formData.get("password") ?? "");

  if (!password) {
    return { ok: false, error: "Informe a senha de acesso." };
  }

  if (!verifyPassword(password)) {
    return { ok: false, error: "Senha incorreta." };
  }

  try {
    await createSession();
  } catch {
    return {
      ok: false,
      error: "Não foi possível criar a sessão. Confira SESSION_SECRET na Vercel.",
    };
  }

  redirect("/controle");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
