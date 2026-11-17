import { SLOTS, slotLabel, type Slot } from './dates';

/**
 * Deux mesures distinctes, déclarées indépendamment :
 * - GAJ : glycémie à jeun, une seule fois par jour, au réveil (donc toujours le matin) ;
 * - GPP : glycémie post-prandiale, après un repas, avec le moment de la journée.
 */
export const KINDS = ['gaj', 'gpp'] as const;
export type Kind = (typeof KINDS)[number];

export const kindLabel: Record<Kind, string> = { gaj: 'GAJ', gpp: 'GPP' };
export const kindLongLabel: Record<Kind, string> = {
  gaj: 'À jeun',
  gpp: 'Post-prandial',
};
export const kindDefaultTime: Record<Kind, string> = { gaj: '06:00', gpp: '12:00' };

export interface Reading {
  id: string;
  /** 'AAAA-MM-JJ' */
  date: string;
  kind: Kind;
  /** Renseigné pour un GPP uniquement : le GAJ est par définition le matin. */
  slot: Slot | null;
  /** 'HH:mm' */
  time: string;
  /** Glycémie en mmol/L */
  value: number;
  note: string;
}

/** Identifiant du document : un GAJ par jour, un GPP par moment. */
export function readingKey(date: string, kind: Kind, slot: Slot | null): string {
  return kind === 'gaj' ? `${date}_gaj` : `${date}_gpp_${slot ?? 'matin'}`;
}

export function readingMatches(reading: Reading, kind: Kind, slot: Slot | null): boolean {
  if (reading.kind !== kind) return false;
  return kind === 'gaj' ? true : reading.slot === slot;
}

export function readingMoments(readings: Reading[]): Slot[] {
  const present = new Set(readings.map((r) => r.slot).filter((s): s is Slot => s !== null));
  return SLOTS.filter((slot) => present.has(slot));
}

export function slotName(reading: Reading): string {
  return reading.slot ? slotLabel[reading.slot] : '';
}
