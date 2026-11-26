/** Poids du jour, en kilogrammes : un seul relevé par date. */
export interface Weight {
  id: string;
  /** 'AAAA-MM-JJ' */
  date: string;
  /** Poids en kg */
  value: number;
  note: string;
}

const oneDecimal = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** « 72,4 » */
export function fmtKg(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : oneDecimal.format(value);
}

/** « +0,6 » / « −1,2 » */
export function fmtKgSigned(value: number): string {
  return `${value < 0 ? '−' : '+'}${oneDecimal.format(Math.abs(value))}`;
}
