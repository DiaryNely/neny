export const OBSERVATION_CATEGORIES = [
  'Activité physique',
  'Stress',
  'Trouble de sommeil',
  'Alimentation excessive',
  'Sucrerie',
  'Autre',
] as const;

export type ObservationCategory = (typeof OBSERVATION_CATEGORIES)[number];

export interface ParsedObservation {
  categories: ObservationCategory[];
  detail: string;
}

export function isObservationCategory(value: string): value is ObservationCategory {
  return OBSERVATION_CATEGORIES.some((category) => category === value);
}

export function parseObservation(value: string): ParsedObservation {
  if (!value) {
    return { categories: [], detail: '' };
  }

  const parts = value.split(', ');
  const otherIndex = parts.findIndex(
    (part) => part === 'Autre' || part.startsWith('Autre: '),
  );

  if (otherIndex !== -1) {
    const preceding = parts.slice(0, otherIndex);
    const categories = preceding.filter(isObservationCategory);
    if (categories.length === preceding.length && !categories.includes('Autre')) {
      const otherPart = parts[otherIndex];
      return {
        categories: [...categories, 'Autre'],
        detail: otherPart.startsWith('Autre: ')
          ? [otherPart.slice('Autre: '.length), ...parts.slice(otherIndex + 1)].join(', ')
          : '',
      };
    }
  }

  const categories = parts.filter(isObservationCategory);
  if (categories.length === parts.length) {
    return { categories, detail: '' };
  }

  return { categories: ['Autre'], detail: value };
}

export function formatObservation(categories: ObservationCategory[], detail = ''): string {
  return OBSERVATION_CATEGORIES.filter((category) => categories.includes(category))
    .map((category) => (category === 'Autre' && detail ? `Autre: ${detail}` : category))
    .join(', ');
}
