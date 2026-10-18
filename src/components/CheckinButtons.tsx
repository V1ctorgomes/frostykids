"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  checkinCriancaAction,
  undoCheckinCriancaAction,
} from "@/actions/checkin";

type Props = {
  criancaId: string;
  version: number;
  presente: boolean;
  nome: string;
};

export function CheckinButtons({ criancaId, version, presente, nome }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  function handleCheckin() {
    setError(null);
    startTransition(async () => {
      const result = await checkinCriancaAction(criancaId, version);
      if (!result.ok) {
        setError(result.error);
        if (result.conflict) refresh();
        return;
      }
      refresh();
    });
  }

  function handleUndo() {
    if (!confirm(`Desfazer o check-in de ${nome}?`)) return;

    setError(null);
    startTransition(async () => {
      const result = await undoCheckinCriancaAction(criancaId, version);
      if (!result.ok) {
        setError(result.error);
        if (result.conflict) refresh();
        return;
      }
      refresh();
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      {presente ? (
        <button
          type="button"
          className="btn btn-secondary min-h-11 px-3.5 text-sm"
          onClick={handleUndo}
          disabled={pending}
        >
          {pending ? "…" : "Desfazer"}
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-success min-h-11 px-3.5 text-sm"
          onClick={handleCheckin}
          disabled={pending}
        >
          {pending ? "…" : "Check-in"}
        </button>
      )}
      {error && (
        <p className="max-w-[8.5rem] text-right text-[0.68rem] leading-snug text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
