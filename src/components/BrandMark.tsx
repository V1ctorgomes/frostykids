import Image from "next/image";

type Props = {
  size?: "xs" | "sm" | "md";
  showWordmark?: boolean;
};

const sizes = {
  xs: { w: 56, h: 33 },
  sm: { w: 72, h: 43 },
  md: { w: 96, h: 57 },
};

export function BrandMark({ size = "xs", showWordmark = false }: Props) {
  const { w, h } = sizes[size];

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Image
        src="/logo-frosty.svg"
        alt="Frosty"
        width={w}
        height={h}
        priority
        unoptimized
        className="h-auto w-auto"
        style={{ width: w, height: "auto" }}
      />
      {showWordmark && (
        <span className="rounded-full bg-[var(--brand-green)] px-2 py-0.5 text-[0.65rem] font-extrabold tracking-wide text-white">
          Kids · Evento
        </span>
      )}
    </div>
  );
}
