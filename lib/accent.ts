/**
 * Calm accent colours cycled by chapter order, so each chapter is recognisable at a glance.
 * All are taken from the existing design palette (clinical blue, emerald, violet) plus muted companions.
 */
const ACCENTS = [
  '#4F9CF9', // clinical blue
  '#2ECC71', // vital emerald
  '#9B59B6', // awareness violet
  '#F39C12', // warm amber
  '#1ABC9C', // teal
  '#E67E8A', // soft rose
  '#7C8CF8', // periwinkle
];

export function accentFor(order: number): string {
  const i = Math.max(0, order - 1) % ACCENTS.length;
  return ACCENTS[i];
}
