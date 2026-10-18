"use server";

import { redirect } from "next/navigation";
import {
  createSession,
  destroySession,
  verifyPassword,
} from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");

  if (!password) {
    return { ok: false, error: "Informe a senha de acesso." };
  }

  if (!verifyPassword(password)) {
    return { ok: false, error: "Senha incorreta." };
  }

  await createSession();
  redirect("/controle");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
