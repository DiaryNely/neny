import type { Kind, Reading } from './types';

/**
 * Seuils de référence, en mmol/L.
 * - GAJ (à jeun) : 4,4 – 7,2 ;
 * - GPP (post-prandial) : au-dessous de 10 ;
 * - hypoglycémie : au-dessous de 3,9, quel que soit le type.
 */
export const HYPO = 3.9;
export const GAJ_MIN = 4.4;
export const GAJ_MAX = 7.2;
export const GPP_MAX = 10;

/** HbA1c visée, en %. */
export const A1C_TARGET = 6.5;

/** Échelle du couloir (jauge de saisie, ventilations, graphique). */
export const SCALE_MIN = 2;
export const SCALE_MAX = 16;

/** Échelle de la jauge d'HbA1c. */
export const A1C_SCALE_MIN = 4;
export const A1C_SCALE_MAX = 12;

export type Status = 'hypo' | 'bas' | 'cible' | 'haut';

export function statusOf(value: number, kind: Kind): Status {
  if (value < HYPO) return 'hypo';
  if (kind === 'gaj') {
    if (value < GAJ_MIN) return 'bas';
    if (value > GAJ_MAX) return 'haut';
    return 'cible';
  }
  return value > GPP_MAX ? 'haut' : 'cible';
}

export const statusTone: Record<Status, { dot: string; text: string }> = {
  hypo: { dot: 'bg-low', text: 'text-low' },
  bas: { dot: 'bg-warn', text: 'text-warn' },
  cible: { dot: 'bg-accent', text: 'text-accent' },
  haut: { dot: 'bg-warn', text: 'text-warn' },
};

export function statusLabel(status: Status, kind: Kind): string {
  switch (status) {
    case 'hypo':
      return 'Hypoglycémie';
    case 'bas':
      return 'Sous la cible';
    case 'haut':
      return kind === 'gaj' ? 'Au-dessus de la cible (7,2)' : 'Au-dessus de 10';
    default:
      return 'Dans la cible';
  }
}

/** Bande cible du type : GAJ 4,4 – 7,2 ; GPP 3,9 – 10. */
export function targetBand(kind: Kind): [number, number] {
  return kind === 'gaj' ? [GAJ_MIN, GAJ_MAX] : [HYPO, GPP_MAX];
}

export function dotColor(value: number, kind: Kind): string {
  switch (statusOf(value, kind)) {
    case 'hypo':
      return 'var(--color-low)';
    case 'bas':
    case 'haut':
      return 'var(--color-warn)';
    default:
      return 'var(--color-accent)';
  }
}

const oneDecimal = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Valeur de glycémie en mmol/L : « 5,6 ». */
export function fmtG(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : oneDecimal.format(value);
}

/** HbA1c en % : « 6,2 ». */
export function fmtA1c(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : oneDecimal.format(value);
}

export function fmtPct(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : `${Math.round(value)} %`;
}

export function fmtSigned(value: number, digits = 1): string {
  const text = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(value));
  return `${value < 0 ? '−' : '+'}${text}`;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export interface Metrics {
  gaj: number | null;
  gpp: number | null;
  inTarget: number | null;
  /** Jours du mois qui portent au moins un relevé. */
  daysTracked: number;
  count: number;
}

export function computeMetrics(readings: Reading[]): Metrics {
  const values = readings.map((r) => r.value).filter(Number.isFinite);
  const inTarget = readings.filter(
    (r) => Number.isFinite(r.value) && statusOf(r.value, r.kind) === 'cible',
  ).length;

  return {
    gaj: mean(readings.filter((r) => r.kind === 'gaj').map((r) => r.value)),
    gpp: mean(readings.filter((r) => r.kind === 'gpp').map((r) => r.value)),
    inTarget: values.length > 0 ? (inTarget / values.length) * 100 : null,
    daysTracked: new Set(readings.map((r) => r.date)).size,
    count: values.length,
  };
}

export function dailyAverage(readings: Reading[]): number | null {
  return mean(readings.map((r) => r.value).filter(Number.isFinite));
}

/**
 * HbA1c estimée, en %, à partir de la moyenne des glycémies (formule ADAG) :
 * eAG (mg/dL) = 28,7 × A1c − 46,7, avec 1 mmol/L = 18,0182 mg/dL.
 */
export function estimatedA1c(meanMmol: number | null): number | null {
  if (meanMmol == null || !Number.isFinite(meanMmol) || meanMmol <= 0) return null;
  return (meanMmol * 18.0182 + 46.7) / 28.7;
}

/** Position 0–100 sur l'échelle du couloir, 2,0 – 16,0 mmol/L par défaut. */
export function scalePercent(value: number, min = SCALE_MIN, max = SCALE_MAX): number {
  const clamped = Math.min(max, Math.max(min, value));
  return ((clamped - min) / (max - min)) * 100;
}

/** Position 0–100 sur l'échelle de l'HbA1c, 4 – 12 %. */
export function a1cPercent(value: number): number {
  return scalePercent(value, A1C_SCALE_MIN, A1C_SCALE_MAX);
}
