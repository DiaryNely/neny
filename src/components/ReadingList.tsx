import { useEffect, useState } from 'react';
import type { Reading } from '../lib/types';
import { dayLabel, slotLabel } from '../lib/dates';
import { fmtG, statusOf, statusTone } from '../lib/glucose';
import { IconChevronLeft, IconChevronRight } from './icons';

/* Une page = un nombre de jours entiers, pour ne jamais couper les relevés d'une même date. */
const DAYS_PER_PAGE = 7;

interface Props {
  readings: Reading[];
  onEdit: (reading: Reading) => void;
  onAddGaj: () => void;
  onAddGpp: () => void;
}

/** Liste groupée par jour : la date ne s'écrit qu'une fois par groupe. */
export function ReadingList({ readings, onEdit, onAddGaj, onAddGpp }: Props) {
  const groups = new Map<string, Reading[]>();
  for (const reading of readings) {
    const list = groups.get(reading.date);
    if (list) list.push(reading);
    else groups.set(reading.date, [reading]);
  }

  const ordered = [...groups.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  const pageCount = Math.max(1, Math.ceil(ordered.length / DAYS_PER_PAGE));
  const [page, setPage] = useState(1);

  /* Une suppression peut faire disparaître la dernière page : on se recale. */
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const visible = ordered.slice((page - 1) * DAYS_PER_PAGE, page * DAYS_PER_PAGE);
  const firstDay = (page - 1) * DAYS_PER_PAGE + 1;
  const lastDay = Math.min(page * DAYS_PER_PAGE, ordered.length);

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
      <header className="flex items-baseline justify-between gap-3 px-4 py-3.5 sm:px-5">
        <h2 className="font-display text-[15px] font-semibold">Journal</h2>
        <p className="tnum text-[12px] text-muted">
          {readings.length} relevé{readings.length > 1 ? 's' : ''} · mmol/L
        </p>
      </header>

      {readings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border-t border-line px-4 py-10">
          <p className="text-[13px] text-muted">Les relevés du mois apparaîtront ici.</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={onAddGaj}
              className="rounded-full border border-line px-3.5 py-2 text-[13px] font-medium transition-colors hover:bg-soft"
            >
              Saisir un GAJ
            </button>
            <button
              type="button"
              onClick={onAddGpp}
              className="rounded-full border border-line px-3.5 py-2 text-[13px] font-medium transition-colors hover:bg-soft"
            >
              Saisir un GPP
            </button>
          </div>
        </div>
      ) : (
        <ul className="border-t border-line">
          {visible.map(([date, list]) => (
            <li key={date} className="border-b border-line last:border-0">
              <ul>
                {list.map((reading, index) => (
                  <li key={reading.id}>
                    <button
                      type="button"
                      onClick={() => onEdit(reading)}
                      className="flex min-h-[44px] w-full flex-col justify-center gap-0.5 px-4 py-3 text-left transition-colors hover:bg-soft/60 sm:px-5"
                    >
                      <span className="flex items-center gap-3">
                        <span className="tnum w-[52px] shrink-0 text-[12px] text-muted">
                          {index === 0 ? dayLabel(reading.date) : ''}
                        </span>

                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusTone[statusOf(reading.value, reading.kind)].dot}`}
                          />
                          <span className="w-8 text-[13px]">
                            {reading.kind === 'gaj' ? 'GAJ' : 'GPP'}
                          </span>
                          <span className="text-[12px] text-muted">
                            {reading.kind === 'gaj' ? 'à jeun' : slotLabel[reading.slot ?? 'matin']}
                          </span>
                          <span className="tnum text-[12px] text-muted">{reading.time}</span>
                          {reading.note && (
                            <span className="hidden truncate text-[12px] text-muted sm:block sm:max-w-[24ch]">
                              {reading.note}
                            </span>
                          )}
                        </span>

                        <span className="tnum ml-auto shrink-0 text-[15px] font-medium">
                          {fmtG(reading.value)}
                        </span>
                      </span>

                      {reading.note && (
                        <span className="block w-full min-w-0 truncate pl-[64px] text-[11.5px] text-muted sm:hidden">
                          {reading.note}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {readings.length > 0 && pageCount > 1 && (
        <footer className="flex items-center justify-between gap-2 border-t border-line px-3 py-2.5 sm:px-4">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            aria-label="Page précédente"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-soft hover:text-ink disabled:pointer-events-none disabled:opacity-30"
          >
            <IconChevronLeft />
          </button>

          <div className="flex min-w-0 flex-col items-center">
            <div className="flex items-center gap-1">
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => setPage(number)}
                  aria-label={`Page ${number}`}
                  aria-current={number === page ? 'page' : undefined}
                  className={`tnum h-9 min-w-9 rounded-lg px-2 text-[12.5px] transition-colors ${
                    number === page
                      ? 'bg-accent/10 font-medium text-accent ring-1 ring-inset ring-accent/20'
                      : 'text-muted hover:bg-soft/70 hover:text-ink'
                  }`}
                >
                  {number}
                </button>
              ))}
            </div>
            <p className="tnum mt-1 text-[10.5px] leading-none text-muted">
              Jours {firstDay}–{lastDay} sur {ordered.length}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            disabled={page === pageCount}
            aria-label="Page suivante"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-soft hover:text-ink disabled:pointer-events-none disabled:opacity-30"
          >
            <IconChevronRight />
          </button>
        </footer>
      )}
    </section>
  );
}
