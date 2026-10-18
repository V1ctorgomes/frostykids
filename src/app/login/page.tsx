import { BrandMark } from "@/components/BrandMark";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="page page-flush flex min-h-dvh flex-col justify-center">
      <div className="surface scoop relative p-5">
        <div className="relative z-10">
          <BrandMark size="xs" showWordmark />
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-[1.85rem] font-semibold leading-tight text-[var(--brand-blue)]">
            Controle de crianças
          </h1>
          <p className="mt-2 text-[0.95rem] leading-snug text-[var(--muted)]">
            Acesso da equipe do evento. Digite a senha compartilhada.
          </p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
