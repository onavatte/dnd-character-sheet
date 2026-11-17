import { kgToLbs } from '../../engine';
import type { TermDisplayMode } from '../../engine';

export interface WeightValueProps {
  kg: number;
  termMode: TermDisplayMode;
  perUnit?: boolean;
}

/**
 * Affiche un poids stocké en kg selon le mode d'unités/langue (fr, en, bilingue).
 */
export function WeightValue({ kg, termMode, perUnit = false }: WeightValueProps) {
  const unitSuffix = perUnit ? '/u' : '';
  const lbs = kgToLbs(kg);

  if (termMode === 'en') {
    return (
      <>
        {lbs} lbs{unitSuffix}
      </>
    );
  }

  return (
    <>
      {kg} kg{unitSuffix}
      {termMode === 'bilingual' && (
        <>
          {' '}
          <span className="original-term">
            ({lbs} lbs{unitSuffix})
          </span>
        </>
      )}
    </>
  );
}

export interface WeightCapacityProps {
  totalKg: number;
  capacityKg: number;
  termMode: TermDisplayMode;
}

/**
 * Affiche la charge actuelle / capacité maximale en kg et/ou lbs selon termMode.
 */
export function WeightCapacity({
  totalKg,
  capacityKg,
  termMode,
}: WeightCapacityProps) {
  const totalLbs = kgToLbs(totalKg);
  const capacityLbs = kgToLbs(capacityKg);

  if (termMode === 'en') {
    return (
      <>
        {totalLbs} / {capacityLbs} lbs
      </>
    );
  }

  return (
    <>
      {totalKg} / {capacityKg} kg
      {termMode === 'bilingual' && (
        <>
          {' '}
          <span className="original-term">
            ({totalLbs} / {capacityLbs} lbs)
          </span>
        </>
      )}
    </>
  );
}
