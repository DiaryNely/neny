import type { Reading } from '../lib/types';
import { dayLabel, slotLabel } from '../lib/dates';
import { fmtG, statusOf, statusTone } from '../lib/glucose';

interface Props {
  readings: Reading[];
  days: number;
  onEdit: (reading: Reading) => void;
  onAdd: () => void;
}

/** Liste groupée par jour : la date ne s'écrit qu'une fois par groupe. */
export function ReadingList({ readings, days, onEdit, onAdd }: Props) {
  const groups = new Map<string, Reading[]>();
  for (const reading of readings) {
    const list = groups.get(reading.date);
    if (list) list.push(reading);
    else groups.set(reading.date, [reading]);
  }

  const ordered = [...groups.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
      <header className="flex items-baseline justify-between gap-3 px-4 py-3.5 sm:px-5">
        <h2 className="font-display text-[15px] font-semibold">Relevés</h2>
        <p className="tnum text-[12px] text-muted">
          {readings.length} sur {days} jours
        </p>
      </header>

      {readings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border-t border-line px-4 py-10">
          <p className="text-[13px] text-muted">Les relevés du mois apparaîtront ici.</p>
          <button
            type="button"
            onClick={onAdd}
            className="rounded-full border border-line px-3.5 py-2 text-[13px] font-medium transition-colors hover:bg-soft"
          >
            Ajouter un relevé
          </button>
        </div>
      ) : (
        <ul className="border-t border-line">
          {ordered.map(([date, list]) => (
            <li key={date} className="border-b border-line last:border-0">
              <ul>
                {list.map((reading, index) => (
                  <li key={reading.id}>
                    <button
                      type="button"
                      onClick={() => onEdit(reading)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-soft/60 sm:px-5"
                    >
                      <span className="tnum w-[52px] shrink-0 text-[12px] text-muted">
                        {index === 0 ? dayLabel(reading.date) : ''}
                      </span>

                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusTone[statusOf(reading.value)].dot}`}
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

                      <span className="ml-auto flex shrink-0 items-baseline gap-1">
                        <span className="tnum text-[15px] font-medium">{fmtG(reading.value)}</span>
                        <span className="text-[11px] text-muted">g/L</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
