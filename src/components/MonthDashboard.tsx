import { useState } from 'react';
import type { Kind, Reading } from '../lib/types';
import { KINDS, kindLabel } from '../lib/types';
import type { Slot } from '../lib/dates';
import {
  SLOTS,
  currentMonthKey,
  daysInMonth,
  monthLabel,
  monthShort,
  shiftMonth,
  slotLabel,
} from '../lib/dates';
import {
  TARGET_MAX,
  TARGET_MIN,
  computeMetrics,
  fmtG,
  fmtPct,
  fmtSigned,
  mean,
  scalePercent,
} from '../lib/glucose';
import { GlucoseChart } from './GlucoseChart';
import { ReadingList } from './ReadingList';
import { IconChevronLeft, IconChevronRight } from './icons';

type KindFilter = 'tous' | Kind;
type MomentFilter = 'tous' | Slot;

interface Props {
  readings: Reading[];
  previous: Reading[];
  loading: boolean;
  error: string | null;
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
  onAdd: () => void;
  onEdit: (reading: Reading) => void;
}

export function MonthDashboard({
  readings,
  previous,
  loading,
  error,
  monthKey,
  onMonthChange,
  onAdd,
  onEdit,
}: Props) {
  const [kindFilter, setKindFilter] = useState<KindFilter>('tous');
  const [momentFilter, setMomentFilter] = useState<MomentFilter>('tous');

  const days = daysInMonth(monthKey);
  const isCurrent = monthKey === currentMonthKey();

  const filtered = readings.filter((reading) => {
    if (kindFilter !== 'tous' && reading.kind !== kindFilter) return false;
    if (kindFilter === 'gpp' && momentFilter !== 'tous' && reading.slot !== momentFilter) {
      return false;
    }
    return true;
  });

  const showsBoth =
    filtered.some((r) => r.kind === 'gaj') && filtered.some((r) => r.kind === 'gpp');

  // Les tuiles résument le mois entier ; le filtre ne pilote que le graphique.
  const metrics = computeMetrics(readings);
  const previousMetrics = computeMetrics(previous);
  const previousLabel = monthShort(shiftMonth(monthKey, -1));

  const deltaGaj =
    metrics.gaj != null && previousMetrics.gaj != null
      ? `${fmtSigned(metrics.gaj - previousMetrics.gaj)} vs ${previousLabel}`
      : null;
  const deltaGpp =
    metrics.gpp != null && previousMetrics.gpp != null
      ? `${fmtSigned(metrics.gpp - previousMetrics.gpp)} vs ${previousLabel}`
      : null;
  const deltaTarget =
    metrics.inTarget != null && previousMetrics.inTarget != null
      ? `${fmtSigned(metrics.inTarget - previousMetrics.inTarget, 0)} pts vs ${previousLabel}`
      : null;

  const skeleton = loading && readings.length === 0;

  const rows = [
    { key: 'gaj', label: 'GAJ', readings: readings.filter((r) => r.kind === 'gaj') },
    ...SLOTS.map((slot) => ({
      key: `gpp-${slot}`,
      label: `GPP ${slotLabel[slot].toLowerCase()}`,
      readings: readings.filter((r) => r.kind === 'gpp' && r.slot === slot),
    })),
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:mb-5">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onMonthChange(shiftMonth(monthKey, -1))}
            aria-label="Mois précédent"
            className="-ml-2 flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-soft hover:text-ink"
          >
            <IconChevronLeft />
          </button>
          <h1 className="px-1 font-display text-[clamp(1.45rem,6.4vw,2rem)] leading-none">
            {monthLabel(monthKey)}
          </h1>
          <button
            type="button"
            onClick={() => onMonthChange(shiftMonth(monthKey, 1))}
            disabled={isCurrent}
            aria-label="Mois suivant"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-soft hover:text-ink disabled:pointer-events-none disabled:opacity-30"
          >
            <IconChevronRight />
          </button>
          {!isCurrent && (
            <button
              type="button"
              onClick={() => onMonthChange(currentMonthKey())}
              className="ml-2 rounded text-[12px] text-accent hover:underline"
            >
              Revenir à ce mois-ci
            </button>
          )}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-3 rounded-xl border border-line bg-card px-3.5 py-2.5 text-[13px] text-low"
        >
          {error}
        </p>
      )}

      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-card md:grid-cols-4">
        <Tile
          label="GAJ moyen"
          value={fmtG(metrics.gaj)}
          unit="g/L"
          note={deltaGaj}
          loading={skeleton}
        />
        <Tile
          label="GPP moyen"
          value={fmtG(metrics.gpp)}
          unit="g/L"
          note={deltaGpp}
          loading={skeleton}
        />
        <Tile
          label="Dans la cible"
          value={fmtPct(metrics.inTarget)}
          note={deltaTarget}
          loading={skeleton}
        />
        <Tile
          label="Jours suivis"
          value={String(metrics.daysTracked)}
          unit={`sur ${days}`}
          note={metrics.count > 0 ? `${metrics.count} relevés` : null}
          loading={skeleton}
        />
      </section>

      <div className="mt-3 grid gap-3 lg:grid-cols-12 lg:gap-4">
        <section className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5 lg:col-span-8">
          <header className="mb-3 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 className="font-display text-[15px] font-semibold">Évolution du mois</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                <span className="tnum">
                  {filtered.length} relevé{filtered.length > 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0 w-3.5 border-t-2 border-accent" />
                  GAJ
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={`h-0 w-3.5 border-t-2 border-accent ${
                      showsBoth ? 'border-dashed border-accent/60' : ''
                    }`}
                  />
                  GPP
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-line p-1">
              {(['tous', ...KINDS] as KindFilter[]).map((value) => (
                <Chip
                  key={value}
                  active={kindFilter === value}
                  onClick={() => {
                    setKindFilter(value);
                    if (value !== 'gpp') setMomentFilter('tous');
                  }}
                >
                  {value === 'tous' ? 'Tous' : kindLabel[value]}
                </Chip>
              ))}

              {kindFilter === 'gpp' && (
                <>
                  <span className="mx-0.5 h-5 w-px shrink-0 bg-line" />
                  <Chip active={momentFilter === 'tous'} onClick={() => setMomentFilter('tous')}>
                    Tous
                  </Chip>
                  {SLOTS.map((slot) => (
                    <Chip
                      key={slot}
                      active={momentFilter === slot}
                      onClick={() => setMomentFilter(slot)}
                    >
                      {slotLabel[slot]}
                    </Chip>
                  ))}
                </>
              )}
            </div>
          </header>

          {skeleton ? (
            <div className="h-[206px] animate-pulse rounded-xl bg-soft/70 md:h-[252px]" />
          ) : (
            <GlucoseChart readings={filtered} monthKey={monthKey} days={days} onAdd={onAdd} />
          )}
        </section>

        <section className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5 lg:col-span-4">
          <header className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-[15px] font-semibold">GAJ et GPP</h2>
            <p className="text-[11px] text-muted">moyenne</p>
          </header>
          <div className="mt-1 divide-y divide-line">
            {rows.map((row) => (
              <SlotRow key={row.key} label={row.label} readings={row.readings} />
            ))}
          </div>
        </section>
      </div>

      <div className="mt-3 lg:mt-4">
        <ReadingList readings={readings} days={days} onEdit={onEdit} onAdd={onAdd} />
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-8 rounded-lg px-2.5 text-[12.5px] transition-colors ${
        active
          ? 'bg-accent/10 font-medium text-accent ring-1 ring-inset ring-accent/20'
          : 'text-muted hover:bg-soft/70 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function Tile({
  label,
  value,
  unit,
  note,
  loading,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string | null;
  loading?: boolean;
}) {
  return (
    <div className="bg-card px-3.5 py-3.5 sm:px-4">
      <p className="text-[12px] text-muted">{label}</p>
      {loading ? (
        <div className="mt-2 h-7 w-16 animate-pulse rounded bg-soft" />
      ) : (
        <p className="mt-1.5 flex items-baseline gap-1">
          <span className="tnum font-display text-[1.55rem] font-semibold leading-none tracking-[-0.03em]">
            {value}
          </span>
          {unit && <span className="text-[11px] text-muted">{unit}</span>}
        </p>
      )}
      <p className="tnum mt-1 h-4 text-[11px] text-muted">{loading ? '' : note ?? ''}</p>
    </div>
  );
}

function SlotRow({ label, readings }: { label: string; readings: Reading[] }) {
  const count = readings.length;
  const average = mean(readings.map((r) => r.value));

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-[86px] shrink-0">
        <p className="truncate text-[13px] font-medium">{label}</p>
        <p className="tnum text-[11px] text-muted">
          {count} relevé{count > 1 ? 's' : ''}
        </p>
      </div>

      <div className="relative h-2 flex-1 rounded-full bg-line">
        <div
          className="absolute inset-y-0 rounded-[2px] bg-accent/20"
          style={{
            left: `${scalePercent(TARGET_MIN)}%`,
            width: `${scalePercent(TARGET_MAX) - scalePercent(TARGET_MIN)}%`,
          }}
        />
        {average != null && (
          <div
            className="absolute top-1/2 h-3 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
            style={{ left: `${scalePercent(average)}%` }}
          />
        )}
      </div>

      <p className="tnum w-10 shrink-0 text-right text-[13px]">{fmtG(average)}</p>
    </div>
  );
}
