import {
  OBSERVATION_CATEGORIES,
  formatObservation,
  parseObservation,
} from '../lib/observations';

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

const field =
  'h-11 w-full min-w-0 rounded-xl border border-line bg-soft/40 px-2.5 text-[14px] transition-colors focus:border-accent/50';

export function ObservationField({ id, value, onChange }: Props) {
  const observation = parseObservation(value);

  return (
    <fieldset className="box-border w-full min-w-0 rounded-2xl border border-line bg-card p-4 shadow-card">
      <legend className="text-[12px] text-muted">
        Observation
      </legend>
      <div className="mt-2 grid gap-1 sm:grid-cols-2">
        {OBSERVATION_CATEGORIES.map((category) => (
          <label
            key={category}
            className="flex min-h-10 min-w-0 items-start gap-2 rounded-lg px-2 py-2 text-[13px] text-ink-2 hover:bg-soft/60"
          >
            <input
              type="checkbox"
              checked={observation.categories.includes(category)}
              onChange={(event) => {
                const categories = event.target.checked
                  ? [...observation.categories, category]
                  : observation.categories.filter((selected) => selected !== category);
                onChange(formatObservation(categories, observation.detail));
              }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
            />
            <span className="min-w-0 break-words">{category}</span>
          </label>
        ))}
      </div>

      {observation.categories.includes('Autre') && (
        <input
          id={`${id}-other`}
          type="text"
          value={observation.detail}
          onChange={(event) => onChange(formatObservation(observation.categories, event.target.value))}
          placeholder="Précisez l’observation"
          autoComplete="off"
          className={`${field} mt-2`}
          aria-label="Précisez l’observation"
        />
      )}
    </fieldset>
  );
}
