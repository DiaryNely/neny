export const SLOTS = ['matin', 'midi', 'soir'] as const;

export type Slot = (typeof SLOTS)[number];

export const slotLabel: Record<Slot, string> = {
  matin: 'Matin',
  midi: 'Midi',
  soir: 'Soir',
};

/** Heure proposée par défaut quand on saisit un relevé d'un autre jour. */
export const slotDefaultTime: Record<Slot, string> = {
  matin: '06:00',
  midi: '12:00',
  soir: '21:00',
};

const pad = (n: number) => String(n).padStart(2, '0');

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function nowTime(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** '2026-09-14' -> Date locale (pas de décalage UTC). */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** '2026-11-17' il y a `days` jours. */
export function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

export function currentMonthKey(): string {
  return monthKeyOf(todayISO());
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Bornes lexicographiques pour la requête Firestore. */
export function monthRange(key: string): [string, string] {
  return [`${key}-01`, `${key}-31`];
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return capitalize(
    new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1)),
  );
}

export function monthShort(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(y, m - 1, 1));
}

/** « lun. 14 » */
export function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' }).format(parseISO(iso));
}

/** « lundi 14 septembre » */
export function fullDateLabel(iso: string): string {
  return capitalize(
    new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(
      parseISO(iso),
    ),
  );
}

/** « 14 septembre 2026 » */
export function longDateLabel(iso: string): string {
  return capitalize(
    new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
      parseISO(iso),
    ),
  );
}

export function isoOf(key: string, day: number): string {
  return `${key}-${pad(day)}`;
}
