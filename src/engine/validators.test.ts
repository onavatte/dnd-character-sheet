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

  it('tolère les fiches sans outils/langues mais rejette un format non-tableau', () => {
    const demo = createDemoCharacter();
    const legacySheet = { ...demo };
    delete legacySheet.toolProficiencies;
    delete legacySheet.languages;
    expect(validateCharacterSheet(legacySheet).valid).toBe(true);

    const badTools = { ...demo, toolProficiencies: 'aucun' };
    expect(validateCharacterSheet(badTools).valid).toBe(false);

    const badLanguages = { ...demo, languages: { commun: true } };
    expect(validateCharacterSheet(badLanguages).valid).toBe(false);
  });

  it('valide la catégorie de taille et rejette une taille invalide', () => {
    const demo = createDemoCharacter();
    const badSize = {
      ...demo,
      identity: {
        ...demo.identity,
        size: 'XXXL',
      },
    };
    const res = validateCharacterSheet(badSize);
    expect(res.valid).toBe(false);
  });

  it('valide les devises, espèces personnalisées, catégories d’inventaire et notes catégorisées avec rétro-compatibilité', () => {
    const demo = createDemoCharacter();
    const legacy = { ...demo };
    delete legacy.currency;
    delete legacy.noteEntries;
    expect(validateCharacterSheet(legacy).valid).toBe(true);

    const badCurrency = {
      ...demo,
      currency: { pp: -1, gp: 0, ep: 0, sp: 0, cp: 0 },
    };
    expect(validateCharacterSheet(badCurrency).valid).toBe(false);

    const badCustomCurrency = {
      ...demo,
      currency: {
        pp: 0,
        gp: 10,
        ep: 0,
        sp: 0,
        cp: 0,
        custom: [{ id: 'c1', name: '', amount: 5 }],
      },
    };
    expect(validateCharacterSheet(badCustomCurrency).valid).toBe(false);

    const badCategory = {
      ...demo,
      inventory: [{ ...demo.inventory[0], category: 'spaceship' }],
    };
    expect(validateCharacterSheet(badCategory).valid).toBe(false);

    const badNoteCategory = {
      ...demo,
      noteEntries: [
        {
          id: 'n1',
          title: 'Test',
          category: 'invalid',
          content: 'abc',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };
    expect(validateCharacterSheet(badNoteCategory).valid).toBe(false);
  });

  it('accepte les fiches anciennes sans features ni defenses mais rejette les formats invalides', () => {
    const demo = createDemoCharacter();
    const legacy = { ...demo } as Record<string, unknown>;
    delete legacy['features'];
    delete legacy['defenses'];

    expect(validateCharacterSheet(legacy).valid).toBe(true);

    const badFeatureCategory = {
      ...demo,
      features: [
        {
          id: 'f1',
          category: 'mythic',
          name: 'Test',
          description: 'desc',
        },
      ],
    };
    expect(validateCharacterSheet(badFeatureCategory).valid).toBe(false);

    const badDefenses = {
      ...demo,
      defenses: {
        senses: ['Vision dans le noir 18 m'],
        resistances: 'Feu',
        damageImmunities: [],
        conditionImmunities: [],
        vulnerabilities: [],
      },
    };
    expect(validateCharacterSheet(badDefenses).valid).toBe(false);
  });
});
