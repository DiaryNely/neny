type BrandMarkProps = { inverted?: boolean; className?: string };

/** Trois mesures de tailles différentes : la marque, c'est le geste du carnet. */
export function BrandMark({ inverted, className = 'h-6 w-6' }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" className={inverted ? 'fill-white/15' : 'fill-accent'} />
      <rect
        x="8"
        y="15"
        width="3.5"
        height="9"
        rx="1.75"
        className={inverted ? 'fill-white/55' : 'fill-white/75'}
      />
      <rect x="14.25" y="8" width="3.5" height="16" rx="1.75" className="fill-white" />
      <rect
        x="20.5"
        y="12"
        width="3.5"
        height="12"
        rx="1.75"
        className={inverted ? 'fill-white/80' : 'fill-white/90'}
      />
    </svg>
  );
}

export function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <BrandMark inverted={inverted} />
      <span
        className={`font-display text-[17px] font-semibold leading-none tracking-[-0.03em] ${
          inverted ? 'text-white' : 'text-ink'
        }`}
      >
        Neny
      </span>
    </span>
  );
}
