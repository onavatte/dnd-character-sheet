import { describe, expect, it } from 'vitest';
import { createDemoCharacter } from './glossary';
import { validateCharacterSheet } from './validators';

describe('Validation de schéma CharacterSheetV1 (validators.ts)', () => {
  it('valide sans erreur le personnage de démonstration complet', () => {
    const demo = createDemoCharacter();
    const res = validateCharacterSheet(demo);
    expect(res.valid).toBe(true);
  });

  it('rejette un payload non-objet ou de mauvaise version de schéma', () => {
    expect(validateCharacterSheet(null).valid).toBe(false);
    expect(validateCharacterSheet('invalid').valid).toBe(false);

    const badVersion = { ...createDemoCharacter(), schemaVersion: 99 };
    const res = validateCharacterSheet(badVersion);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.errors[0]).toContain('Version de schéma non supportée');
    }
  });

  it('rejette un portraitDataUrl qui ne commence pas par data:image/ (protection XSS)', () => {
    const demo = createDemoCharacter();
    const malicious = {
      ...demo,
      identity: {
        ...demo.identity,
        portraitDataUrl: 'javascript:alert(1)',
      },
    };
    const res = validateCharacterSheet(malicious);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.errors.some((e) => e.includes('portraitDataUrl'))).toBe(true);
    }
  });

  it('rejette des scores de caractéristiques hors des bornes 1..30', () => {
    const demo = createDemoCharacter();
    const invalidAbilities = {
      ...demo,
      abilities: {
        ...demo.abilities,
        STR: 45,
      },
    };
    const res = validateCharacterSheet(invalidAbilities);
    expect(res.valid).toBe(false);
  });
});
