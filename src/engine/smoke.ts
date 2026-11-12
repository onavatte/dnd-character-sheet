/**
 * Fonctions pures de base du moteur D&D 5e (2014) — Validation de l'outillage Jalon 0.
 * Aucun import de React, du DOM ni du stockage.
 */

export function computeAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatSignedModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}
