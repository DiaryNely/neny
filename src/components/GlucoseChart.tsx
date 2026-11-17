import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { Kind, Reading } from '../lib/types';
import { SLOTS, fullDateLabel, isoOf, parseISO, slotLabel } from '../lib/dates';
import { TARGET_MAX, TARGET_MIN, dotColor, fmtG, mean } from '../lib/glucose';

interface Props {
  readings: Reading[];
  monthKey: string;
  days: number;
  onAdd: () => void;
}

type Point = { day: number; value: number };

const DOMAIN_MIN = 0.4;

function formatTick(tick: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(tick);
}

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

/** Moyenne du jour pour un type : une seule valeur pour le GAJ, celle du moment pour le GPP. */
function seriesFor(byDay: Map<number, Reading[]>, kind: Kind): Point[] {
  const points: Point[] = [];

  for (const day of [...byDay.keys()].sort((a, b) => a - b)) {
    const values = (byDay.get(day) ?? [])
      .filter((reading) => reading.kind === kind)
      .map((reading) => reading.value)
      .filter(Number.isFinite);

    if (values.length === 0) continue;
    const average = mean(values);
    if (average != null) points.push({ day, value: average });
  }

  return points;
}

/** Une coupure de plus de deux jours interrompt la ligne. */
function toSegments(points: Point[]): Point[][] {
  const segments: Point[][] = [];
  let current: Point[] = [];

  points.forEach((point, index) => {
    if (index > 0 && point.day - points[index - 1].day > 2) {
      if (current.length > 0) segments.push(current);
      current = [];
    }
    current.push(point);
  });

  if (current.length > 0) segments.push(current);
  return segments;
}

export function GlucoseChart({ readings, monthKey, days, onAdd }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useWidth(containerRef);
  const [active, setActive] = useState<number | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<number, Reading[]>();
    for (const reading of readings) {
      const day = parseISO(reading.date).getDate();
      const list = map.get(day);
      if (list) list.push(reading);
      else map.set(day, [reading]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'gaj' ? -1 : 1;
        const ai = a.slot ? SLOTS.indexOf(a.slot) : -1;
        const bi = b.slot ? SLOTS.indexOf(b.slot) : -1;
        return ai - bi;
      });
    }
    return map;
  }, [readings]);

  const gajPoints = useMemo(() => seriesFor(byDay, 'gaj'), [byDay]);
  const gppPoints = useMemo(() => seriesFor(byDay, 'gpp'), [byDay]);
  const showsBoth = gajPoints.length > 0 && gppPoints.length > 0;

  const { domainMin, domainMax } = useMemo(() => {
    const values = readings.map((r) => r.value).filter(Number.isFinite);
    const max = values.length ? Math.max(...values) : 1.4;
    const min = values.length ? Math.min(...values) : 0.9;
    return {
      domainMax: Math.max(1.8, Math.ceil((max + 0.05) * 10) / 10),
      domainMin: Math.min(DOMAIN_MIN, Math.floor((min - 0.05) * 10) / 10),
    };
  }, [readings]);

  const W = Math.max(width, 240);
  const H = W < 560 ? 206 : 252;
  const padL = 30;
  const padR = 10;
  const padT = 12;
  const padB = 22;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const span = Math.max(1, days - 1);
  const step = plotW / span;

  const x = (day: number) => padL + ((day - 1) / span) * plotW;
  const y = (value: number) => padT + ((domainMax - value) / (domainMax - domainMin)) * plotH;

  const ticks = [0.5, 1, 1.5, 2].filter((tick) => tick >= domainMin && tick <= domainMax);
  const xTicks = [...new Set([1, 8, 15, 22, days])].filter((day) => day >= 1 && day <= days);

  const activeReadings = active != null ? byDay.get(active) ?? [] : [];
  const isEmpty = readings.length === 0;

  const summary = isEmpty
    ? 'Graphique de la glycémie du mois, aucun relevé'
    : `Glycémie du mois : ${readings.length} relevé${readings.length > 1 ? 's' : ''}`;

  const tooltipLeft = active != null ? Math.min(Math.max(x(active), 88), W - 88) : 0;

  const pathFor = (points: Point[]) =>
    points.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.day)},${y(point.value)}`).join(' ');

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
        {/* Le couloir cible */}
        <rect
          x={padL}
          y={y(TARGET_MAX)}
          width={plotW}
          height={Math.max(0, y(TARGET_MIN) - y(TARGET_MAX))}
          fill="var(--color-accent)"
          fillOpacity={0.08}
        />
        <line
          x1={padL}
          x2={padL + plotW}
          y1={y(TARGET_MAX)}
          y2={y(TARGET_MAX)}
          stroke="var(--color-accent)"
          strokeOpacity={0.35}
          strokeDasharray="3 3"
        />
        <line
          x1={padL}
          x2={padL + plotW}
          y1={y(TARGET_MIN)}
          y2={y(TARGET_MIN)}
          stroke="var(--color-accent)"
          strokeOpacity={0.35}
          strokeDasharray="3 3"
        />

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
              {formatTick(tick)}
            </text>
          </g>
        ))}

        <line
          x1={padL}
          x2={padL + plotW}
          y1={padT + plotH}
          y2={padT + plotH}
          stroke="var(--color-line-strong)"
          strokeWidth={1}
        />

        {xTicks.map((day) => (
          <text
            key={day}
            x={x(day)}
            y={H - 6}
            textAnchor={day === 1 ? 'start' : day === days ? 'end' : 'middle'}
            fontSize={10}
            fill="var(--color-muted)"
            className="tnum"
          >
            {day}
          </text>
        ))}

        {toSegments(gppPoints).map((segment) => (
          <path
            key={`gpp-${segment[0].day}`}
            d={pathFor(segment)}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2}
            strokeOpacity={showsBoth ? 0.55 : 1}
            strokeDasharray={showsBoth ? '4 3' : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {toSegments(gajPoints).map((segment) => (
          <path
            key={`gaj-${segment[0].day}`}
            d={pathFor(segment)}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2}
            strokeDasharray={showsBoth ? undefined : '4 3'}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {[...byDay.entries()].flatMap(([day, list]) =>
          list.map((reading) => (
            <circle
              key={reading.id}
              cx={x(day)}
              cy={y(reading.value)}
              r={2.6}
              fill={dotColor(reading.value)}
              stroke="var(--color-card)"
              strokeWidth={1}
            />
          )),
        )}

        {active != null && (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={padT}
            y2={padT + plotH}
            stroke="var(--color-ink)"
            strokeOpacity={0.18}
            strokeWidth={1}
          />
        )}

        {/* Une zone de touche par jour */}
        {Array.from({ length: days }, (_, index) => index + 1).map((day) => (
          <rect
            key={day}
            x={padL + (day - 1) * step - step / 2}
            y={padT}
            width={step}
            height={plotH}
            fill="transparent"
            onPointerDown={() => setActive(day)}
            onPointerEnter={(event) => {
              if (event.pointerType === 'mouse') setActive(day);
            }}
            onPointerLeave={(event) => {
              if (event.pointerType === 'mouse') setActive(null);
            }}
          />
        ))}
      </svg>

      {active != null && activeReadings.length > 0 && (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-xl bg-tip px-3 py-2 shadow-pop"
          style={{ left: tooltipLeft }}
        >
          <p className="text-[11px] text-white/60">{fullDateLabel(isoOf(monthKey, active))}</p>
          <div className="mt-1 space-y-1">
            {activeReadings.map((reading) => (
              <p key={reading.id} className="flex items-center gap-1.5 text-[11px] text-white/80">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: dotColor(reading.value) }}
                />
                <span className="text-white">{reading.kind === 'gaj' ? 'GAJ' : 'GPP'}</span>
                {reading.slot && <span className="text-white/55">{slotLabel[reading.slot]}</span>}
                <span className="tnum ml-auto pl-3 text-[13px] text-white">
                  {fmtG(reading.value)}
                </span>
              </p>
            ))}
          </div>
        </div>
      )}

      {isEmpty && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <p className="text-[13px] text-muted">Aucun relevé ce mois-ci</p>
          <button
            type="button"
            onClick={onAdd}
            className="rounded-full border border-line bg-card px-3.5 py-2 text-[13px] font-medium shadow-card transition-colors hover:bg-soft"
          >
            Ajouter un relevé
          </button>
        </div>
      )}
    </div>
  );
}
