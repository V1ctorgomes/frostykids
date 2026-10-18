import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { FamiliaForm } from "@/components/FamiliaForm";

export default function NovoCadastroPage() {
  return (
    <main className="page page-flush">
      <header className="topbar">
        <BrandMark size="xs" />
        <Link href="/controle" className="btn btn-ghost">
          Voltar
        </Link>
      </header>
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-[1.65rem] font-semibold text-[var(--brand-blue)]">
        Nova família
      </h1>
      <p className="mb-4 text-sm text-[var(--muted)]">
        Responsável + crianças. Campos em branco são permitidos.
      </p>
      <FamiliaForm mode="create" />
    </main>
  );
}
