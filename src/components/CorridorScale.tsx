import type { Kind } from '../lib/types';
import { SCALE_MAX, dotColor, fmtG, scalePercent, targetBand } from '../lib/glucose';

/**
 * Le couloir, en petit : la bande cible du type mesuré et l'aiguille de la valeur saisie.
 * GAJ 4,4 – 7,2 mmol/L, GPP 3,9 – 10 mmol/L, plus le seuil d'hypoglycémie à 3,9.
 * C'est la même échelle que le graphique du mois.
 */
export function CorridorScale({ value, kind }: { value: number | null; kind: Kind }) {
  const hasValue = value != null && Number.isFinite(value);
  const [bandMin, bandMax] = targetBand(kind);
  const ticks = [bandMin, bandMax];

  return (
    <div className="mt-3">
      <div className="relative h-3 rounded-full bg-soft">
        <div
          className="absolute inset-y-0 rounded-[3px] bg-accent/30"
          style={{
            left: `${scalePercent(bandMin)}%`,
            width: `${scalePercent(bandMax) - scalePercent(bandMin)}%`,
          }}
        />
        {ticks.map((tick) => (
          <div
            key={tick}
            className="absolute inset-y-0 w-[1.5px] rounded bg-accent/60"
            style={{ left: `${scalePercent(tick)}%` }}
          />
        ))}

        {/* Seuil d'hypoglycémie, toujours visible */}
        <div
          className="absolute inset-y-0 w-[1.5px] rounded bg-low/70"
          style={{ left: `${scalePercent(3.9)}%` }}
        />

        {hasValue && (
          <div
            className="absolute -top-1 h-5 w-[3px] -translate-x-1/2 rounded-full transition-[left] duration-200"
            style={{ left: `${scalePercent(value)}%`, background: dotColor(value, kind) }}
          />
        )}
      </div>

      <div className="relative mt-1 h-4">
        {ticks.map((tick) => (
          <span
            key={tick}
            className="absolute -translate-x-1/2 text-[10px] text-muted tnum"
            style={{ left: `${scalePercent(tick)}%` }}
          >
            {fmtG(tick)}
          </span>
        ))}
        <span className="absolute right-0 text-[10px] text-muted tnum">{fmtG(SCALE_MAX)}</span>
      </div>
    </div>
  );
}
