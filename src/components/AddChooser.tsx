import { IconChevronRight } from './icons';

export type AddTarget = 'gaj' | 'gpp' | 'poids';

const options: { target: AddTarget; title: string; hint: string }[] = [
  { target: 'gaj', title: 'GAJ', hint: 'Glycémie à jeun, au réveil · 1 par jour' },
  { target: 'gpp', title: 'GPP', hint: 'Glycémie après repas · matin, midi, soir' },
  { target: 'poids', title: 'Poids', hint: 'Poids du jour en kg · 1 par jour' },
];

/** Les trois saisies sont indépendantes : on choisit d'abord laquelle ouvrir. */
export function AddChooser({ onPick }: { onPick: (target: AddTarget) => void }) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="mb-1 font-display text-[1.45rem]">Ajouter</h1>
      <p className="mb-4 text-[12px] text-muted">Chaque mesure a son propre formulaire.</p>

      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.target}
            type="button"
            onClick={() => onPick(option.target)}
            className="flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-left shadow-card transition-colors hover:bg-soft/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[12px] font-medium text-accent ring-1 ring-inset ring-accent/15">
              {option.target === 'poids' ? 'kg' : option.title}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium">
                {option.target === 'poids' ? 'Poids' : `Nouveau ${option.title}`}
              </span>
              <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted">
                {option.hint}
              </span>
            </span>
            <IconChevronRight className="h-4 w-4 shrink-0 text-muted" />
          </button>
        ))}
      </div>
    </div>
  );
}
