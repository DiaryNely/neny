import { TARGET_MAX, TARGET_MIN, dotColor, fmtG, scalePercent } from '../lib/glucose';

/**
 * Le couloir, en petit : la bande cible 0,70 – 1,10 g/L et l'aiguille de la valeur saisie.
 * C'est la même échelle que le graphique du mois.
 */
export function CorridorScale({ value }: { value: number | null }) {
  const hasValue = value != null && Number.isFinite(value);

  return (
    <div className="mt-3">
      <div className="relative h-3 rounded-full bg-soft">
        <div
          className="absolute inset-y-0 rounded-[3px] bg-accent/15"
          style={{
            left: `${scalePercent(TARGET_MIN)}%`,
            width: `${scalePercent(TARGET_MAX) - scalePercent(TARGET_MIN)}%`,
          }}
        />
        <div
          className="absolute inset-y-0 w-px bg-accent/40"
          style={{ left: `${scalePercent(TARGET_MIN)}%` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-accent/40"
          style={{ left: `${scalePercent(TARGET_MAX)}%` }}
        />
        {hasValue && (
          <div
            className="absolute -top-1 h-5 w-[3px] -translate-x-1/2 rounded-full transition-[left] duration-200"
            style={{ left: `${scalePercent(value)}%`, background: dotColor(value) }}
          />
        )}
      </div>

      <div className="relative mt-1 h-4">
        {[TARGET_MIN, TARGET_MAX].map((tick) => (
          <span
            key={tick}
            className="absolute -translate-x-1/2 text-[10px] text-muted tnum"
            style={{ left: `${scalePercent(tick)}%` }}
          >
            {fmtG(tick)}
          </span>
        ))}
        <span className="absolute right-0 text-[10px] text-muted tnum">{fmtG(2)}</span>
      </div>
    </div>
  );
}
