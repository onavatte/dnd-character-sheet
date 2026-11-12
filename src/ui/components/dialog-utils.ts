import type { MouseEvent } from 'react';

/**
 * Fallback pour `closedby="any"` sur les navigateurs ne supportant pas encore
 * nativement la propriété `HTMLDialogElement.prototype.closedBy` (ex. Safari).
 * Vérifie que le clic a eu lieu sur l'élément `<dialog>` lui-même ET en dehors
 * de la boîte de contenu (`getBoundingClientRect()`).
 */
export function handleDialogBackdropClick(
  event: MouseEvent<HTMLDialogElement>,
): void {
  const dialog = event.currentTarget;
  if ('closedBy' in HTMLDialogElement.prototype) {
    return;
  }
  if (event.target !== dialog) {
    return;
  }
  const rect = dialog.getBoundingClientRect();
  const isDialogContent =
    rect.top <= event.clientY &&
    event.clientY <= rect.top + rect.height &&
    rect.left <= event.clientX &&
    event.clientX <= rect.left + rect.width;

  if (!isDialogContent) {
    dialog.close();
  }
}

export type DiceRollMode = 'physical' | 'virtual';

export interface ActiveRollTarget {
  id: string;
  label: string;
  originalLabel?: string;
  category: 'skill' | 'ability' | 'save' | 'attack' | 'initiative' | 'damage' | 'free';
  modifier: number;
  damageFormula?: string;
  damageType?: string;
  initialMode?: 'd20' | 'formula' | 'free';
  isCritical?: boolean;
}
