import { describe, expect, it } from 'vitest';
import { computeAbilityModifier, formatSignedModifier } from './smoke';

describe('Moteur D&D 5e — Test de fumée (Jalon 0)', () => {
  it('calcule correctement le modificateur de caractéristique selon la règle floor((score - 10) / 2)', () => {
    expect(computeAbilityModifier(8)).toBe(-1);
    expect(computeAbilityModifier(10)).toBe(0);
    expect(computeAbilityModifier(11)).toBe(0);
    expect(computeAbilityModifier(16)).toBe(3);
    expect(computeAbilityModifier(20)).toBe(5);
  });

  it('formate toujours le modificateur avec son signe explicite', () => {
    expect(formatSignedModifier(-1)).toBe('-1');
    expect(formatSignedModifier(0)).toBe('+0');
    expect(formatSignedModifier(4)).toBe('+4');
  });
});
