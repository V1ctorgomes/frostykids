"use client";

import { useActionState } from "react";
import { loginAction } from "@/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="password" className="label">
          Senha de acesso
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
          placeholder="Digite a senha"
          disabled={pending}
          enterKeyHint="go"
        />
      </div>

      {state && !state.ok && (
        <p className="rounded-[1rem] bg-[var(--danger-bg)] px-3 py-2.5 text-sm font-bold text-[var(--danger)]">
          {state.error}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
