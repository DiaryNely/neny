import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { Kind, Reading } from '../lib/types';
import { SLOTS, fullDateLabel, isoOf, parseISO, slotLabel } from '../lib/dates';
import { GAJ_MAX, GAJ_MIN, GPP_MAX, HYPO, dotColor, fmtG, mean, targetBand } from '../lib/glucose';

interface Props {
  /** Relevés d'un seul type : ce graphe ne trace que le GAJ ou que le GPP. */
  readings: Reading[];
  kind: Kind;
  monthKey: string;
  days: number;
  /** Absent sur le rapport imprimable : aucune action de saisie n'y est proposée. */
  onAdd?: () => void;
}

type Point = { day: number; value: number };

const DOMAIN_MIN = 3;
const DOMAIN_MAX_FLOOR = 11;

const tickFormat = new Intl.NumberFormat('fr-FR');

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

/** Une coupure de plus de deux jours interrompt la courbe. */
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

export function GlucoseChart({ readings, kind, monthKey, days, onAdd }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useWidth(containerRef);
  const [active, setActive] = useState<number | null>(null);

  // Relevés regroupés par jour, dans l'ordre des moments de la journée.
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
        const ai = a.slot ? SLOTS.indexOf(a.slot) : -1;
        const bi = b.slot ? SLOTS.indexOf(b.slot) : -1;
        return ai - bi;
      });
    }
    return map;
  }, [readings]);

  // La courbe passe par la moyenne du jour : une valeur pour le GAJ, celle du moment pour un GPP filtré.
  const points = useMemo(() => {
    const list: Point[] = [];
    for (const day of [...byDay.keys()].sort((a, b) => a - b)) {
      const average = mean(
        (byDay.get(day) ?? []).map((reading) => reading.value).filter(Number.isFinite),
      );
      if (average != null) list.push({ day, value: average });
    }
    return list;
  }, [byDay]);

  const { domainMin, domainMax } = useMemo(() => {
    const values = readings.map((r) => r.value).filter(Number.isFinite);
    const max = values.length ? Math.max(...values) : 9;
    const min = values.length ? Math.min(...values) : GAJ_MIN;
    return {
      domainMax: Math.max(DOMAIN_MAX_FLOOR, Math.ceil(max + 0.5)),
      domainMin: Math.min(DOMAIN_MIN, Math.floor(min - 0.5)),
    };
  }, [readings]);

  const W = Math.max(width, 240);
  const H = W < 560 ? 208 : 246;
  const padL = 28;
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
  const ticks = [2, 4, 6, 8, 10, 12, 14, 16].filter(
    (tick) => tick >= domainMin && tick <= domainMax,
  );
  const xTicks = [...new Set([1, 8, 15, 22, days])].filter((day) => day >= 1 && day <= days);

  const [bandMin, bandMax] = targetBand(kind);
  const activeReadings = active != null ? byDay.get(active) ?? [] : [];
  const isEmpty = readings.length === 0;

  // Sur mobile, l'infobulle se ferme dès qu'on fait défiler la page.
  useEffect(() => {
    if (active == null) return;
    const close = () => setActive(null);
    window.addEventListener('scroll', close, { passive: true });
    return () => window.removeEventListener('scroll', close);
  }, [active]);

  const label = kind === 'gaj' ? 'à jeun' : 'post-prandial';
  const summary = isEmpty
    ? `Graphique ${label} du mois, aucun relevé`
    : `Glycémie ${label} du mois : ${readings.length} relevé${readings.length > 1 ? 's' : ''}`;

  const tooltipLeft = active != null ? Math.min(Math.max(x(active), 88), W - 88) : 0;

  const linePath = (segment: Point[]) =>
    segment
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.day)},${y(point.value)}`)
      .join(' ');

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
        {/* La bande cible : GAJ 4,4 – 7,2, GPP 3,9 – 10 */}
        <rect
          x={padL}
          y={y(bandMax)}
          width={plotW}
          height={Math.max(0, y(bandMin) - y(bandMax))}
          fill="var(--color-accent)"
          fillOpacity={0.1}
        />

        {/* Grille horizontale */}
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
              {tickFormat.format(tick)}
            </text>
          </g>
        ))}

        {/* Grille verticale, alignée sur les jours gradués */}
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

        {kind === 'gaj' ? (
          <>
            <line
              x1={padL}
              x2={padL + plotW}
              y1={y(GAJ_MAX)}
              y2={y(GAJ_MAX)}
              stroke="var(--color-accent)"
              strokeOpacity={0.4}
              strokeDasharray="3 3"
            />
            <line
              x1={padL}
              x2={padL + plotW}
              y1={y(GAJ_MIN)}
              y2={y(GAJ_MIN)}
              stroke="var(--color-accent)"
              strokeOpacity={0.4}
              strokeDasharray="3 3"
            />
          </>
        ) : (
          <line
            x1={padL}
            x2={padL + plotW}
            y1={y(GPP_MAX)}
            y2={y(GPP_MAX)}
            stroke="var(--color-warn)"
            strokeOpacity={0.55}
            strokeDasharray="5 3"
          />
        )}

        {/* Seuil d'hypoglycémie */}
        <line
          x1={padL}
          x2={padL + plotW}
          y1={y(HYPO)}
          y2={y(HYPO)}
          stroke="var(--color-low)"
          strokeOpacity={0.5}
          strokeDasharray="5 3"
        />
        <text
          x={padL + plotW - 2}
          y={y(HYPO) + 10}
          textAnchor="end"
          fontSize={9.5}
          fill="var(--color-low)"
          className="tnum"
        >
          3,9
        </text>

        {/* Axe de base + jours */}
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

        {/* La courbe, jour par jour */}
        {toSegments(points).map((segment) => (
          <path
            key={`line-${segment[0].day}`}
            d={linePath(segment)}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Un point par relevé, coloré selon la cible */}
        {[...byDay.entries()].flatMap(([day, list]) =>
          list.map((reading) => (
            <circle
              key={reading.id}
              cx={x(day)}
              cy={y(reading.value)}
              r={3.2}
              fill={dotColor(reading.value, reading.kind)}
              stroke="var(--color-card)"
              strokeWidth={1.5}
            />
          )),
        )}

        {active != null && (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={padT}
            y2={baseY}
            stroke="var(--color-ink)"
            strokeOpacity={0.22}
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
                  style={{ background: dotColor(reading.value, reading.kind) }}
                />
                {reading.slot && <span className="text-white/55">{slotLabel[reading.slot]}</span>}
                <span className="text-white/55 tnum">{reading.time}</span>
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
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="rounded-full border border-line bg-card px-3.5 py-2 text-[13px] font-medium shadow-card transition-colors hover:bg-soft"
            >
              Ajouter un relevé
            </button>
          )}
        </div>
      )}
    </div>
  );
}
