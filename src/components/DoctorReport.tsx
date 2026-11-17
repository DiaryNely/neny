import { useEffect, useMemo, useState } from 'react';
import { Brand } from './Brand';
import { GlucoseChart } from './GlucoseChart';
import { loadShare, type Share, type SharedReading } from '../lib/share';
import type { Kind, Reading } from '../lib/types';
import {
  SLOTS,
  daysInMonth,
  longDateLabel,
  monthLabel,
  monthShort,
  parseISO,
  shiftMonth,
  slotLabel,
  todayISO,
} from '../lib/dates';
import {
  A1C_TARGET,
  GAJ_MAX,
  GAJ_MIN,
  GPP_MAX,
  HYPO,
  computeMetrics,
  estimatedA1c,
  fmtA1c,
  fmtG,
  fmtPct,
  mean,
  statusOf,
} from '../lib/glucose';

/**
 * Page publique du médecin : `?d=<jeton>`. Aucune connexion n'est demandée,
 * le jeton ne donne accès qu'à un instantané (voir `lib/share.ts`).
 */
export function DoctorReport({ token }: { token: string }) {
  const [share, setShare] = useState<Share | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');

  useEffect(() => {
    document.title = 'Rapport glycémique — Neny';
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    loadShare(token)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setState('missing');
          return;
        }
        setShare(result);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state === 'loading') return <ReportSplash />;

  if (state !== 'ready' || !share) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-card">
          <Brand />
          <h1 className="mt-4 font-display text-[1.2rem]">
            {state === 'missing' ? 'Ce lien n’est plus valable' : 'Rapport indisponible'}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
            {state === 'missing'
              ? 'Le lien a été révoqué ou régénéré. Demandez un nouveau lien à la personne qui vous a transmis celui-ci.'
              : 'Impossible de charger le rapport. Vérifiez votre connexion, puis rechargez la page.'}
          </p>
        </div>
      </div>
    );
  }

  return <ShareReport share={share} />;
}

function ReportSplash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <Brand />
      <div className="h-1 w-24 animate-pulse rounded-full bg-line-strong" />
    </div>
  );
}

/** Le rapport lui-même : séparé du chargement pour rester imprimable et testable. */
export function ShareReport({ share }: { share: Share }) {
  const readings = useMemo<Reading[]>(
    () =>
      share.readings.map((reading, index) => ({
        id: `${reading.date}-${reading.kind}-${reading.slot ?? 'gaj'}-${index}`,
        ...reading,
      })),
    [share.readings],
  );

  const metrics = useMemo(() => computeMetrics(readings), [readings]);
  const a1c = estimatedA1c(mean(readings.map((reading) => reading.value)));
  const hypoCount = readings.filter((reading) => reading.value < HYPO).length;

  const months = useMemo(() => {
    if (!share.from || !share.to) return [];
    const list: string[] = [];
    let key = share.from.slice(0, 7);
    const end = share.to.slice(0, 7);
    for (let guard = 0; guard < 24 && key <= end; guard += 1) {
      list.push(key);
      key = shiftMonth(key, 1);
    }
    return list;
  }, [share.from, share.to]);

  const moments = useMemo(
    () => [
      { label: 'GAJ — à jeun', kind: 'gaj' as Kind, list: readings.filter((r) => r.kind === 'gaj') },
      ...SLOTS.map((slot) => ({
        label: `GPP — ${slotLabel[slot].toLowerCase()}`,
        kind: 'gpp' as Kind,
        list: readings.filter((r) => r.kind === 'gpp' && r.slot === slot),
      })),
    ],
    [readings],
  );

  /** Une ligne par jour : la lecture la plus rapide pour un médecin. */
  const dayRows = useMemo(() => {
    const map = new Map<
      string,
      { gaj?: SharedReading; matin?: SharedReading; midi?: SharedReading; soir?: SharedReading }
    >();
    for (const reading of share.readings) {
      const row = map.get(reading.date) ?? {};
      if (reading.kind === 'gaj') row.gaj = reading;
      else if (reading.slot) row[reading.slot] = reading;
      map.set(reading.date, row);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  }, [share.readings]);

  const shortDate = (iso: string) =>
    new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(parseISO(iso));

  return (
    <div className="min-h-dvh bg-page print:bg-white">
      <div className="mx-auto w-full max-w-[900px] px-4 py-5 sm:px-6 print:max-w-none print:px-0 print:py-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Brand />
          <button
            type="button"
            onClick={() => window.print()}
            className="h-11 rounded-xl bg-accent px-4 text-[13px] font-medium text-on-accent transition-opacity hover:opacity-95"
          >
            Imprimer / Enregistrer en PDF
          </button>
        </div>

        <article className="space-y-3">
          <header className="rounded-2xl border border-line bg-card px-4 py-3.5 shadow-card sm:px-5 print:rounded-none print:border-0 print:border-b print:border-line print:px-0 print:shadow-none">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <div className="min-w-0">
                <p className="text-[10.5px] uppercase tracking-[0.14em] text-muted">
                  Rapport glycémique
                </p>
                <h1 className="mt-1 font-display text-[1.5rem] leading-tight">
                  {share.patient || 'Relevés glycémiques'}
                </h1>
                <p className="tnum mt-1 text-[12px] text-ink-2">
                  Du {longDateLabel(share.from)} au {longDateLabel(share.to)} ·{' '}
                  {metrics.count} relevé{metrics.count > 1 ? 's' : ''} · {metrics.daysTracked} jour
                  {metrics.daysTracked > 1 ? 's' : ''} suivi{metrics.daysTracked > 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-left text-[11px] leading-relaxed text-muted sm:text-right">
                <p>Neny — carnet glycémique</p>
                <p className="tnum">Édité le {longDateLabel(todayISO())}</p>
                <p>Glycémies en mmol/L</p>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3 print:break-inside-avoid print:rounded-none">
            <Stat
              label="GAJ moyen"
              value={fmtG(metrics.gaj)}
              unit="mmol/L"
              note={`cible ${fmtG(GAJ_MIN)} – ${fmtG(GAJ_MAX)}`}
            />
            <Stat
              label="GPP moyen"
              value={fmtG(metrics.gpp)}
              unit="mmol/L"
              note={`cible < ${fmtG(GPP_MAX)}`}
            />
            <Stat
              label="Dans la cible"
              value={fmtPct(metrics.inTarget)}
              note={`sur ${metrics.count} relevés`}
            />
            <Stat
              label="HbA1c estimée"
              value={fmtA1c(a1c)}
              unit="%"
              note={`cible ≤ ${fmtA1c(A1C_TARGET)} %`}
            />
            <Stat
              label="Hypoglycémies"
              value={String(hypoCount)}
              note={`< ${fmtG(HYPO)} mmol/L`}
            />
            <Stat
              label="Relevés"
              value={String(metrics.count)}
              note={`${metrics.daysTracked} jours suivis`}
            />
          </section>

          <section className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5 print:break-inside-avoid print:rounded-none print:border-0 print:px-0 print:shadow-none">
            <h2 className="font-display text-[15px] font-semibold">Moyennes par moment</h2>
            <div className="mt-2 overflow-x-auto print:overflow-visible">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-line text-left text-[10.5px] uppercase tracking-wide text-muted">
                    <th className="whitespace-nowrap py-1.5 pr-2 font-medium">Mesure</th>
                    <th className="whitespace-nowrap py-1.5 px-2 text-right font-medium">Relevés</th>
                    <th className="whitespace-nowrap py-1.5 px-2 text-right font-medium">Moyenne</th>
                    <th className="hidden whitespace-nowrap py-1.5 px-2 text-right font-medium sm:table-cell">
                      Min
                    </th>
                    <th className="hidden whitespace-nowrap py-1.5 px-2 text-right font-medium sm:table-cell">
                      Max
                    </th>
                    <th className="whitespace-nowrap py-1.5 pl-2 text-right font-medium">Cible</th>
                  </tr>
                </thead>
                <tbody>
                  {moments.map((moment) => {
                    const values = moment.list.map((reading) => reading.value).filter(Number.isFinite);
                    const inTarget = moment.list.filter(
                      (reading) => statusOf(reading.value, reading.kind) === 'cible',
                    ).length;
                    return (
                      <tr key={moment.label} className="border-b border-line last:border-0">
                        <td className="whitespace-nowrap py-1.5 pr-2 text-ink-2">{moment.label}</td>
                        <td className="tnum py-1.5 px-2 text-right">{values.length}</td>
                        <td className="tnum py-1.5 px-2 text-right text-[12.5px] font-medium">
                          {fmtG(mean(values))}
                        </td>
                        <td className="tnum hidden py-1.5 px-2 text-right text-muted sm:table-cell">
                          {values.length ? fmtG(Math.min(...values)) : '—'}
                        </td>
                        <td className="tnum hidden py-1.5 px-2 text-right text-muted sm:table-cell">
                          {values.length ? fmtG(Math.max(...values)) : '—'}
                        </td>
                        <td className="tnum py-1.5 pl-2 text-right text-muted">
                          {values.length ? fmtPct((inTarget / values.length) * 100) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-soft/40">
                    <td className="py-1.5 pr-2 font-medium">Toutes mesures</td>
                    <td className="tnum py-1.5 px-2 text-right">{metrics.count}</td>
                    <td className="tnum py-1.5 px-2 text-right text-[12.5px] font-medium">
                      {fmtG(mean(readings.map((reading) => reading.value)))}
                    </td>
                    <td className="hidden py-1.5 px-2 sm:table-cell" />
                    <td className="hidden py-1.5 px-2 sm:table-cell" />
                    <td className="tnum py-1.5 pl-2 text-right text-muted">
                      {fmtPct(metrics.inTarget)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {months.map((monthKey) => {
            const monthReadings = readings.filter((reading) => reading.date.startsWith(monthKey));
            const gaj = monthReadings.filter((reading) => reading.kind === 'gaj');
            const gpp = monthReadings.filter((reading) => reading.kind === 'gpp');
            const days = daysInMonth(monthKey);

            return (
              <section
                key={monthKey}
                className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5 print:break-inside-avoid print:rounded-none print:border-0 print:px-0 print:shadow-none"
              >
                <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="font-display text-[15px] font-semibold">{monthLabel(monthKey)}</h2>
                  <p className="tnum text-[11px] text-muted">
                    {monthReadings.length} relevé{monthReadings.length > 1 ? 's' : ''} · GAJ{' '}
                    {fmtG(mean(gaj.map((reading) => reading.value)))} · GPP{' '}
                    {fmtG(mean(gpp.map((reading) => reading.value)))} mmol/L
                  </p>
                </header>

                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-[11px] text-muted">GAJ — à jeun</p>
                    <GlucoseChart
                      readings={gaj}
                      kind="gaj"
                      monthKey={monthKey}
                      days={days}
                    />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted">GPP — après repas</p>
                    <GlucoseChart
                      readings={gpp}
                      kind="gpp"
                      monthKey={monthKey}
                      days={days}
                    />
                  </div>
                </div>
              </section>
            );
          })}

          <section className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5 print:rounded-none print:border-0 print:px-0 print:shadow-none">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="font-display text-[15px] font-semibold">Relevés, jour par jour</h2>
              <p className="text-[10.5px] text-muted">
                Vert : dans la cible · ambre : hors cible · rouge : hypoglycémie
              </p>
            </div>

            {dayRows.length === 0 ? (
              <p className="mt-3 text-[13px] text-muted">
                Aucun relevé sur cette période.
              </p>
            ) : (
              <div className="mt-2 overflow-x-auto print:overflow-visible">
                <table className="w-full border-collapse text-[11.5px]">
                  <thead>
                    <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-muted">
                      <th className="py-1.5 pr-2 font-medium">Date</th>
                      <th className="py-1.5 px-2 text-right font-medium">GAJ</th>
                      <th className="py-1.5 px-2 text-right font-medium">Matin</th>
                      <th className="py-1.5 px-2 text-right font-medium">Midi</th>
                      <th className="py-1.5 px-2 text-right font-medium">Soir</th>
                      <th className="py-1.5 pl-3 font-medium">Observation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayRows.map(([date, row]) => {
                      const notes = [row.gaj, row.matin, row.midi, row.soir]
                        .filter((reading): reading is SharedReading => Boolean(reading))
                        .map((reading) => reading.note)
                        .filter(Boolean);

                      return (
                        <tr
                        key={date}
                        className="border-b border-line align-top last:border-0 print:py-0.5"
                      >
                          <td className="tnum whitespace-nowrap py-1.5 pr-2 text-muted print:py-0.5">
                            {shortDate(date)}
                          </td>
                          <Cell reading={row.gaj} />
                          <Cell reading={row.matin} />
                          <Cell reading={row.midi} />
                          <Cell reading={row.soir} />
                          <td className="py-1.5 pl-3 text-[11px] leading-snug text-muted print:py-0.5">
                            {notes.join(' · ')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <footer className="pb-4 text-[10.5px] leading-relaxed text-muted print:pb-0">
            <p>
              Cibles utilisées : GAJ {fmtG(GAJ_MIN)} – {fmtG(GAJ_MAX)} mmol/L, GPP &lt;{' '}
              {fmtG(GPP_MAX)} mmol/L, hypoglycémie &lt; {fmtG(HYPO)} mmol/L, HbA1c ≤{' '}
              {fmtA1c(A1C_TARGET)} %.
            </p>
            <p className="mt-1">
              L’HbA1c indiquée est une <strong className="font-medium">estimation</strong> calculée
              par la formule ADAG à partir de la moyenne des glycémies de la période ; elle ne
              remplace pas un dosage biologique. Automesures déclarées par la personne suivie.
            </p>
            <p className="mt-1">
              Période partagée : {monthShort(share.from.slice(0, 7))} –{' '}
              {longDateLabel(share.to)}
              {share.updatedAt
                ? ` · instantané du ${longDateLabel(
                    `${share.updatedAt.getFullYear()}-${String(share.updatedAt.getMonth() + 1).padStart(2, '0')}-${String(share.updatedAt.getDate()).padStart(2, '0')}`,
                  )}`
                : ''}
              .
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}

function Cell({ reading }: { reading?: SharedReading }) {
  if (!reading) {
    return <td className="tnum py-1.5 px-2 text-right text-muted/60 print:py-0.5">·</td>;
  }

  const status = statusOf(reading.value, reading.kind);
  const tone =
    status === 'cible' ? 'text-ink' : status === 'hypo' ? 'text-low font-medium' : 'text-warn';

  return (
    <td className={`tnum py-1.5 px-2 text-right print:py-0.5 ${tone}`}>{fmtG(reading.value)}</td>
  );
}

function Stat({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
}) {
  return (
    <div className="bg-card px-3.5 py-3">
      <p className="text-[11.5px] text-muted">{label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="tnum font-display text-[1.4rem] font-semibold leading-none tracking-[-0.03em]">
          {value}
        </span>
        {unit && <span className="text-[10.5px] text-muted">{unit}</span>}
      </p>
      <p className="tnum mt-1 text-[10.5px] text-muted">{note ?? ''}</p>
    </div>
  );
}
