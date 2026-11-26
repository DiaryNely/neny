import { useState } from 'react';
import type { Kind, Reading } from '../lib/types';
import type { Slot } from '../lib/dates';
import {
  SLOTS,
  currentMonthKey,
  dayLabel,
  daysInMonth,
  monthLabel,
  monthShort,
  shiftMonth,
  slotLabel,
} from '../lib/dates';
import {
  A1C_TARGET,
  GAJ_MAX,
  GAJ_MIN,
  GPP_MAX,
  a1cPercent,
  computeMetrics,
  dotColor,
  estimatedA1c,
  fmtA1c,
  fmtG,
  fmtPct,
  fmtSigned,
  mean,
  scalePercent,
  targetBand,
} from '../lib/glucose';
import { fmtKg, fmtKgSigned, type Weight } from '../lib/weight';
import { GlucoseChart } from './GlucoseChart';
import { ReadingList } from './ReadingList';
import { WeightChart } from './WeightChart';
import { IconChevronLeft, IconChevronRight } from './icons';

type MomentFilter = 'tous' | Slot;

interface Props {
  readings: Reading[];
  previous: Reading[];
  /** 90 derniers jours, tous mois confondus : base de l'HbA1c estimée. */
  recent: Reading[];
  loading: boolean;
  error: string | null;
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
  weights: Weight[];
  weightsLoading: boolean;
  onAddGaj: () => void;
  onAddGpp: () => void;
  onAddWeight: () => void;
  onEdit: (reading: Reading) => void;
}

export function MonthDashboard({
  readings,
  previous,
  recent,
  loading,
  error,
  monthKey,
  onMonthChange,
  weights,
  weightsLoading,
  onAddGaj,
  onAddGpp,
  onAddWeight,
  onEdit,
}: Props) {
  const [momentFilter, setMomentFilter] = useState<MomentFilter>('tous');

  const days = daysInMonth(monthKey);
  const isCurrent = monthKey === currentMonthKey();

  const gajReadings = readings.filter((reading) => reading.kind === 'gaj');
  const gppAll = readings.filter((reading) => reading.kind === 'gpp');
  const gppReadings =
    momentFilter === 'tous' ? gppAll : gppAll.filter((reading) => reading.slot === momentFilter);

  // Les tuiles résument le mois entier ; les filtres ne pilotent que le graphe du GPP.
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
    {
      key: 'gaj',
      label: 'GAJ',
      kind: 'gaj' as Kind,
      readings: gajReadings,
    },
    ...SLOTS.map((slot) => ({
      key: `gpp-${slot}`,
      label: `GPP ${slotLabel[slot].toLowerCase()}`,
      kind: 'gpp' as Kind,
      readings: gppAll.filter((reading) => reading.slot === slot),
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
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-soft hover:text-ink"
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
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-soft hover:text-ink disabled:pointer-events-none disabled:opacity-30"
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
          unit="mmol/L"
          note={deltaGaj}
          loading={skeleton}
        />
        <Tile
          label="GPP moyen"
          value={fmtG(metrics.gpp)}
          unit="mmol/L"
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

      <A1cCard readings={recent} loading={skeleton} />

      <div className="mt-3 grid gap-3 lg:grid-cols-2 lg:gap-4">
        <ChartCard
          title="GAJ — à jeun"
          hint={`Cible ${fmtG(GAJ_MIN)} – ${fmtG(GAJ_MAX)} mmol/L`}
          readings={gajReadings}
          kind="gaj"
          monthKey={monthKey}
          days={days}
          loading={skeleton}
          onAdd={onAddGaj}
        />

        <ChartCard
          title="GPP — après repas"
          hint={`Cible < ${fmtG(GPP_MAX)} mmol/L`}
          readings={gppReadings}
          kind="gpp"
          monthKey={monthKey}
          days={days}
          loading={skeleton}
          onAdd={onAddGpp}
          filters={
            <>
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
          }
        />
      </div>

      <div className="mt-3">
        <WeightCard
          weights={weights}
          days={days}
          loading={weightsLoading}
          onAdd={onAddWeight}
        />
      </div>

      <section className="mt-3 rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-[15px] font-semibold">Moyennes par moment</h2>
          <p className="text-[11px] text-muted">mmol/L</p>
        </header>
        <div className="mt-1 divide-y divide-line">
          {rows.map((row) => (
            <SlotRow key={row.key} label={row.label} kind={row.kind} readings={row.readings} />
          ))}
        </div>
      </section>

      <div className="mt-3 lg:mt-4">
        <ReadingList
          key={monthKey}
          readings={readings}
          onEdit={onEdit}
          onAddGaj={onAddGaj}
          onAddGpp={onAddGpp}
        />
      </div>
    </div>
  );
}

function ChartCard({
  title,
  hint,
  readings,
  kind,
  monthKey,
  days,
  loading,
  onAdd,
  filters,
}: {
  title: string;
  hint: string;
  readings: Reading[];
  kind: Kind;
  monthKey: string;
  days: number;
  loading: boolean;
  onAdd: () => void;
  filters?: React.ReactNode;
}) {
  const average = mean(readings.map((reading) => reading.value));

  return (
    <section className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h2 className="font-display text-[15px] font-semibold">{title}</h2>
          <p className="mt-0.5 text-[11px] text-muted">{hint}</p>
        </div>
        <p className="tnum text-[11px] text-muted">
          {readings.length} relevé{readings.length > 1 ? 's' : ''} · moyenne{' '}
          <span className="text-[13px] font-medium text-ink-2">{fmtG(average)}</span>
        </p>
      </header>

      {filters && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1 rounded-xl border border-line p-1">
          {filters}
        </div>
      )}

      <div className="mt-2">
        {loading ? (
          <div className="h-[208px] animate-pulse rounded-xl bg-soft/70 md:h-[246px]" />
        ) : (
          <GlucoseChart
            readings={readings}
            kind={kind}
            monthKey={monthKey}
            days={days}
            onAdd={onAdd}
          />
        )}
      </div>
    </section>
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
      className={`h-10 shrink-0 rounded-lg px-3 text-[12.5px] transition-colors sm:h-8 sm:px-2.5 ${
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

function SlotRow({
  label,
  kind,
  readings,
}: {
  label: string;
  kind: Kind;
  readings: Reading[];
}) {
  const count = readings.length;
  const average = mean(readings.map((r) => r.value));
  const [bandMin, bandMax] = targetBand(kind);

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
          className="absolute inset-y-0 rounded-[2px] bg-accent/25"
          style={{
            left: `${scalePercent(bandMin)}%`,
            width: `${scalePercent(bandMax) - scalePercent(bandMin)}%`,
          }}
        />
        {average != null && (
          <div
            className="absolute top-1/2 h-3 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${scalePercent(average)}%`,
              background: dotColor(average, kind),
            }}
          />
        )}
      </div>

      <p className="tnum w-10 shrink-0 text-right text-[13px]">{fmtG(average)}</p>
    </div>
  );
}

/**
 * HbA1c estimée : la moyenne glycémique des deux à trois derniers mois,
 * convertie en % par la formule ADAG.
 */
function A1cCard({ readings, loading }: { readings: Reading[]; loading?: boolean }) {
  const values = readings.map((r) => r.value).filter(Number.isFinite);
  const a1c = estimatedA1c(mean(values));
  const onTarget = a1c != null && a1c <= A1C_TARGET;
  const count = values.length;

  return (
    <section className="mt-3 rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h2 className="font-display text-[15px] font-semibold">HbA1c estimée</h2>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
            Moyenne des 3 derniers mois
            {count > 0 && ` · ${count} relevé${count > 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-baseline gap-1.5">
          {loading ? (
            <div className="h-7 w-14 animate-pulse rounded bg-soft" />
          ) : (
            <>
              <span className="tnum font-display text-[1.7rem] font-semibold leading-none tracking-[-0.03em]">
                {fmtA1c(a1c)}
              </span>
              <span className="text-[12px] text-muted">%</span>
              <span
                className={`ml-1 text-[11.5px] ${
                  a1c == null ? 'text-muted' : onTarget ? 'text-accent' : 'text-warn'
                }`}
              >
                cible ≤ {fmtA1c(A1C_TARGET)} %
              </span>
            </>
          )}
        </div>
      </div>

      <div className="relative mt-3 h-2.5 rounded-full bg-soft">
        <div
          className="absolute inset-y-0 left-0 rounded-[2px] bg-accent/25"
          style={{ width: `${a1cPercent(A1C_TARGET)}%` }}
        />
        <div
          className="absolute inset-y-0 w-[1.5px] rounded bg-accent/60"
          style={{ left: `${a1cPercent(A1C_TARGET)}%` }}
        />
        {a1c != null && (
          <div
            className="absolute -top-1 h-[18px] w-[3px] -translate-x-1/2 rounded-full transition-[left] duration-200"
            style={{
              left: `${a1cPercent(a1c)}%`,
              background: onTarget ? 'var(--color-accent)' : 'var(--color-warn)',
            }}
          />
        )}
      </div>

      <div className="relative mt-1 h-4 text-[10px] text-muted tnum">
        <span className="absolute left-0">4,0</span>
        <span
          className="absolute -translate-x-1/2"
          style={{ left: `${a1cPercent(A1C_TARGET)}%` }}
        >
          {fmtA1c(A1C_TARGET)}
        </span>
        <span className="absolute right-0">12,0</span>
      </div>

      {!loading && count === 0 && (
        <p className="mt-2 text-[12px] text-muted">
          Ajoutez des relevés pour l’estimer : elle se calcule sur l’ensemble des mesures.
        </p>
      )}
    </section>
  );
}

/**
 * Poids du mois : dernier relevé, évolution depuis le premier du mois et courbe.
 * Un relevé par jour, en kg.
 */
function WeightCard({
  weights,
  days,
  loading,
  onAdd,
}: {
  weights: Weight[];
  days: number;
  loading: boolean;
  onAdd: () => void;
}) {
  const first = weights[0] ?? null;
  const last = weights[weights.length - 1] ?? null;
  const delta = first && last && weights.length > 1 ? last.value - first.value : null;

  return (
    <section className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h2 className="font-display text-[15px] font-semibold">Poids</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            {weights.length} relevé{weights.length > 1 ? 's' : ''} · kg
          </p>
        </div>
        <div className="text-right">
          {loading ? (
            <div className="h-6 w-16 animate-pulse rounded bg-soft" />
          ) : (
            <>
              <p className="tnum font-display text-[15px] font-semibold leading-none">
                {fmtKg(last?.value)}
                <span className="ml-1 text-[11px] font-normal text-muted">kg</span>
              </p>
              <p className="tnum mt-1 text-[11px] text-muted">
                {delta != null && first && last
                  ? `${fmtKgSigned(delta)} depuis le ${dayLabel(first.date)}`
                  : last
                    ? `le ${dayLabel(last.date)}`
                    : 'Aucun relevé'}
              </p>
            </>
          )}
        </div>
      </header>

      <div className="mt-2">
        {loading ? (
          <div className="h-[208px] animate-pulse rounded-xl bg-soft/70 md:h-[246px]" />
        ) : (
          <WeightChart weights={weights} days={days} />
        )}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="mt-3 h-11 w-full rounded-xl border border-line text-[13px] font-medium text-ink-2 transition-colors hover:bg-soft"
      >
        {last ? 'Ajouter ou modifier le poids du jour' : 'Ajouter le poids du jour'}
      </button>
    </section>
  );
}
