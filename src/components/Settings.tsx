import type { User } from 'firebase/auth';
import { TARGET_MAX, TARGET_MIN, fmtG } from '../lib/glucose';

export function Settings({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const initial = (user.email ?? '?').charAt(0).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="mb-4 font-display text-[1.45rem]">Compte</h1>

      <div className="space-y-3">
        <section className="rounded-2xl border border-line bg-card p-4 shadow-card">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[14px] font-medium text-accent ring-1 ring-inset ring-accent/15">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium">{user.email}</p>
              <p className="text-[12px] text-muted">Accès créé par l’administrateur</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-card p-4 shadow-card">
          <h2 className="text-[13px] font-medium">Plages de référence</h2>
          <dl className="mt-3 space-y-2.5 text-[13px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-ink-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Dans la cible
              </dt>
              <dd className="tnum text-muted">
                {fmtG(TARGET_MIN)} – {fmtG(TARGET_MAX)} g/L
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-ink-2">
                <span className="h-1.5 w-1.5 rounded-full bg-low" />
                Sous la cible
              </dt>
              <dd className="tnum text-muted">&lt; {fmtG(TARGET_MIN)} g/L</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-ink-2">
                <span className="h-1.5 w-1.5 rounded-full bg-warn" />
                Au-dessus
              </dt>
              <dd className="tnum text-muted">&gt; {fmtG(TARGET_MAX)} g/L</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            Ces seuils servent au code couleur de l’application. Ils ne remplacent pas un avis
            médical.
          </p>
        </section>

        <button
          type="button"
          onClick={onSignOut}
          className="h-11 w-full rounded-xl border border-line bg-card text-[13px] font-medium text-ink-2 shadow-card transition-colors hover:bg-soft"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
