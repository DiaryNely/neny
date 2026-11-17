import type { Reading } from './types';

/** Valeurs de référence usuelles en France, en g/L. */
export const TARGET_MIN = 0.7;
export const TARGET_MAX = 1.1;
export const SCALE_MIN = 0.4;
export const SCALE_MAX = 2;

export type Status = 'bas' | 'cible' | 'haut';

export function statusOf(value: number): Status {
  if (value < TARGET_MIN) return 'bas';
  if (value > TARGET_MAX) return 'haut';
  return 'cible';
}

export const statusTone: Record<Status, { label: string; dot: string; text: string }> = {
  bas: { label: 'Sous la cible', dot: 'bg-low', text: 'text-low' },
  cible: { label: 'Dans la cible', dot: 'bg-accent', text: 'text-accent' },
  haut: { label: 'Au-dessus de la cible', dot: 'bg-warn', text: 'text-warn' },
};

export function dotColor(value: number): string {
  switch (statusOf(value)) {
    case 'bas':
      return 'var(--color-low)';
    case 'haut':
      return 'var(--color-warn)';
    default:
      return 'var(--color-accent)';
  }
}

const twoDecimals = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtG(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : twoDecimals.format(value);
}

export function fmtPct(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : `${Math.round(value)} %`;
}

export function fmtSigned(value: number, digits = 2): string {
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
  const inTarget = values.filter((v) => v >= TARGET_MIN && v <= TARGET_MAX).length;

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

/** Position 0–100 sur l'échelle 0,40 – 2,00 g/L. */
export function scalePercent(value: number): number {
  const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, value));
  return ((clamped - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;
}
