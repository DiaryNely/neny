import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { fullDateLabel, parseISO } from '../lib/dates';
import { fmtKg, type Weight } from '../lib/weight';

interface Props {
  weights: Weight[];
  days: number;
}

type Point = { day: number; value: number };

/** Le graphe est mesuré en pixels : les traits gardent leur épaisseur à toutes les largeurs. */
function useWidth(ref: RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    setWidth(element.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}

export function WeightChart({ weights, days }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useWidth(containerRef);
  const [active, setActive] = useState<number | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<number, Weight>();
    for (const weight of weights) {
      map.set(parseISO(weight.date).getDate(), weight);
    }
    return map;
  }, [weights]);

  const points = useMemo<Point[]>(
    () =>
      [...byDay.entries()]
        .map(([day, weight]) => ({ day, value: weight.value }))
        .filter((point) => Number.isFinite(point.value))
        .sort((a, b) => a.day - b.day),
    [byDay],
  );

  /* L'échelle suit les valeurs du mois, avec au moins 4 kg d'amplitude pour rester lisible. */
  const { domainMin, domainMax, ticks } = useMemo(() => {
    const values = points.map((point) => point.value);
    if (values.length === 0) {
      return { domainMin: 60, domainMax: 80, ticks: [60, 65, 70, 75, 80] };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    let low = Math.floor(min - 1);
    let high = Math.ceil(max + 1);
    if (high - low < 4) {
      const middle = (high + low) / 2;
      low = Math.floor(middle - 2);
      high = Math.ceil(middle + 2);
    }

    const step = Math.max(1, Math.round((high - low) / 4));
    const list: number[] = [];
    for (let tick = low; tick <= high; tick += step) list.push(tick);

    return { domainMin: low, domainMax: Math.max(high, list[list.length - 1] ?? high), ticks: list };
  }, [points]);

  const W = Math.max(width, 240);
  const H = W < 560 ? 208 : 246;
  const padL = 30;
  const padR = 12;
  const padT = 14;
  const padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const span = Math.max(1, days - 1);
  const step = plotW / span;

  const x = (day: number) => padL + ((day - 1) / span) * plotW;
  const y = (value: number) => padT + ((domainMax - value) / (domainMax - domainMin)) * plotH;
  const baseY = padT + plotH;

  const xTicks = [...new Set([1, 8, 15, 22, days])].filter((day) => day >= 1 && day <= days);
  const activeWeight = active != null ? byDay.get(active) ?? null : null;
  const isEmpty = points.length === 0;

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.day)},${y(point.value)}`)
    .join(' ');

  // Sur mobile, l'infobulle se ferme dès qu'on fait défiler la page.
  useEffect(() => {
    if (active == null) return;
    const close = () => setActive(null);
    window.addEventListener('scroll', close, { passive: true });
    return () => window.removeEventListener('scroll', close);
  }, [active]);

  const summary = isEmpty
    ? 'Graphique du poids du mois, aucun relevé'
    : `Poids du mois : ${points.length} relevé${points.length > 1 ? 's' : ''}`;

  const tooltipLeft = active != null ? Math.min(Math.max(x(active), 76), W - 76) : 0;

  return (
    <div ref={containerRef} className="relative touch-pan-y">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label={summary}
        className="block"
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={padL}
              x2={padL + plotW}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--color-line)"
              strokeWidth={1}
            />
            <text
              x={padL - 7}
              y={y(tick) + 3.5}
              textAnchor="end"
              fontSize={10}
              fill="var(--color-muted)"
              className="tnum"
            >
              {tick}
            </text>
          </g>
        ))}

        {xTicks.map((day) => (
          <line
            key={`grid-${day}`}
            x1={x(day)}
            x2={x(day)}
            y1={padT}
            y2={baseY}
            stroke="var(--color-line)"
            strokeOpacity={0.7}
            strokeWidth={1}
          />
        ))}

        <line
          x1={padL}
          x2={padL + plotW}
          y1={baseY}
          y2={baseY}
          stroke="var(--color-line-strong)"
          strokeWidth={1}
        />

        {xTicks.map((day) => (
          <text
            key={`tick-${day}`}
            x={x(day)}
            y={H - 7}
            textAnchor={day === 1 ? 'start' : day === days ? 'end' : 'middle'}
            fontSize={10}
            fill="var(--color-muted)"
            className="tnum"
          >
            {day}
          </text>
        ))}

        {!isEmpty && (
          <path
            d={path}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map((point) => (
          <circle
            key={point.day}
            cx={x(point.day)}
            cy={y(point.value)}
            r={3.2}
            fill="var(--color-accent)"
            stroke="var(--color-card)"
            strokeWidth={1.5}
          />
        ))}

        {activeWeight && (
          <line
            x1={x(parseISO(activeWeight.date).getDate())}
            x2={x(parseISO(activeWeight.date).getDate())}
            y1={padT}
            y2={baseY}
            stroke="var(--color-ink)"
            strokeOpacity={0.22}
            strokeWidth={1}
          />
        )}

        {Array.from({ length: days }, (_, index) => index + 1).map((day) => (
          <rect
            key={day}
            x={padL + (day - 1) * step - step / 2}
            y={padT}
            width={step}
            height={plotH}
            fill="transparent"
            onPointerDown={() => setActive((current) => (current === day ? null : day))}
            onPointerEnter={(event) => {
              if (event.pointerType === 'mouse') setActive(day);
            }}
            onPointerLeave={(event) => {
              if (event.pointerType === 'mouse') setActive(null);
            }}
          />
        ))}
      </svg>

      {activeWeight && (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-xl bg-tip px-3 py-2 shadow-pop"
          style={{ left: tooltipLeft }}
        >
          <p className="text-[11px] text-white/60">{fullDateLabel(activeWeight.date)}</p>
          <p className="tnum mt-0.5 text-[13px] text-white">{fmtKg(activeWeight.value)} kg</p>
          {activeWeight.note && (
            <p className="mt-0.5 max-w-[22ch] text-[11px] text-white/70">{activeWeight.note}</p>
          )}
        </div>
      )}

      {isEmpty && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <p className="text-[13px] text-muted">Aucun poids ce mois-ci</p>
          <p className="text-[11px] text-muted">Le graphe se trace dès le premier relevé.</p>
        </div>
      )}

      {!isEmpty && (
        <p className="pointer-events-none absolute right-0 top-0 tnum text-[10px] text-muted">
          kg
        </p>
      )}
    </div>
  );
}
