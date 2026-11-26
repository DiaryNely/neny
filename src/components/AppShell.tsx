import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { Brand } from './Brand';
import { IconCalendar, IconPlus, IconUser } from './icons';

export type ViewName = 'mois' | 'ajouter' | 'gaj' | 'gpp' | 'poids' | 'compte';

interface Props {
  user: User;
  view: ViewName;
  onNavigate: (view: ViewName) => void;
  toast: string | null;
  children: ReactNode;
}

const tabs: { name: ViewName; label: string }[] = [
  { name: 'mois', label: 'Mois' },
  { name: 'ajouter', label: 'Ajouter' },
  { name: 'compte', label: 'Compte' },
];

export function AppShell({ user, view, onNavigate, toast, children }: Props) {
  const initial = (user.email ?? '?').charAt(0).toUpperCase();
  /* « Ajouter » reste actif pendant les formulaires de saisie, tous séparés. */
  const isActive = (name: ViewName) =>
    view === name ||
    (name === 'ajouter' && (view === 'gaj' || view === 'gpp' || view === 'poids'));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-page/85 backdrop-blur-md md:static md:bg-transparent">
        <div className="mx-auto flex h-14 w-full max-w-[1180px] items-center gap-4 px-4 sm:px-6 md:h-16 lg:px-8">
          <button
            type="button"
            onClick={() => onNavigate('mois')}
            className="-ml-1 flex h-11 items-center rounded-lg px-1"
            aria-label="Neny, retour au mois"
          >
            <Brand />
          </button>

          <nav className="ml-2 hidden items-center gap-1 md:flex">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                type="button"
                onClick={() => onNavigate(tab.name)}
                aria-current={isActive(tab.name) ? 'page' : undefined}
                className={`h-9 rounded-lg px-3 text-[13px] transition-colors ${
                  isActive(tab.name)
                    ? 'bg-accent/8 font-medium text-accent ring-1 ring-inset ring-accent/20'
                    : 'text-muted hover:bg-soft/70 hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => onNavigate('compte')}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-[13px] font-medium text-accent ring-1 ring-inset ring-accent/15 transition-colors hover:bg-accent/15"
            aria-label="Compte"
          >
            {initial}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-28 pt-5 sm:px-6 md:pb-14 md:pt-6 lg:px-8">
        {children}
      </main>

      {toast && (
        <div
          role="status"
          className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-tip px-4 py-2 text-[13px] text-white shadow-pop md:bottom-8"
        >
          {toast}
        </div>
      )}

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-3">
          <TabButton
            label="Mois"
            active={isActive('mois')}
            onClick={() => onNavigate('mois')}
            icon={<IconCalendar className="h-[18px] w-[18px]" />}
          />
          <TabButton
            label="Ajouter"
            active={isActive('ajouter')}
            onClick={() => onNavigate('ajouter')}
            accent
            icon={<IconPlus className="h-[18px] w-[18px]" />}
          />
          <TabButton
            label="Compte"
            active={isActive('compte')}
            onClick={() => onNavigate('compte')}
            icon={<IconUser className="h-[18px] w-[18px]" />}
          />
        </div>
      </nav>
    </div>
  );
}

function TabButton({
  label,
  icon,
  active,
  accent,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  accent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className="group flex min-h-[56px] flex-col items-center justify-center gap-1 pt-1.5 pb-1"
    >
      <span
        className={
          accent
            ? 'flex h-9 w-9 items-center justify-center rounded-full bg-accent text-on-accent shadow-card'
            : `flex h-9 w-9 items-center justify-center rounded-full ${
                active ? 'text-accent' : 'text-muted'
              }`
        }
      >
        {icon}
      </span>
      <span className={`text-[11px] ${active || accent ? 'text-ink' : 'text-muted'}`}>{label}</span>
    </button>
  );
}
