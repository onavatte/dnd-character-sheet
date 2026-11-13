import { describe, expect, it } from 'vitest';
import {
  ABILITY_GLOSSARY,
  CANONICAL_CONDITIONS_5E,
  CANONICAL_SKILLS_5E,
  createBlankCharacter,
  createDefaultSkills,
  createDemoCharacter,
  matchesBilingualSearch,
  normalizeSearchText,
} from './glossary';
import { validateCharacterSheet } from './validators';

describe('Lexique bilingue FR/EN & Recherche (glossary.ts)', () => {
  it('expose les 6 caractéristiques et les 18 compétences officielles D&D 5e (2014)', () => {
    expect(Object.keys(ABILITY_GLOSSARY)).toHaveLength(6);
    expect(CANONICAL_SKILLS_5E).toHaveLength(18);
    expect(CANONICAL_CONDITIONS_5E.length).toBeGreaterThanOrEqual(15);
  });

  it('normalise les accents et la casse pour la recherche', () => {
    expect(normalizeSearchText('  Discrétion & Épuisement  ')).toBe(
      'discretion & epuisement',
    );
  });

  it('trouve une entrée aussi bien par son nom français que par son originalName anglais', () => {
    const sleight = { name: 'Escamotage', originalName: 'Sleight of Hand' };
    const stealth = { name: 'Discrétion', originalName: 'Stealth' };

    expect(matchesBilingualSearch(sleight, 'escam')).toBe(true);
    expect(matchesBilingualSearch(sleight, 'sleight')).toBe(true);
    expect(matchesBilingualSearch(stealth, 'discretion')).toBe(true);
    expect(matchesBilingualSearch(stealth, 'STEA')).toBe(true);
    expect(matchesBilingualSearch(stealth, 'arcana')).toBe(false);
    expect(matchesBilingualSearch(stealth, '   ')).toBe(true);
  });

  it('génère les 18 compétences par défaut et une fiche démo multi-classée cohérente', () => {
    const defaultSkills = createDefaultSkills();
    expect(defaultSkills).toHaveLength(18);

    const demo = createDemoCharacter();
    expect(demo.identity.classes).toHaveLength(2);
    expect(demo.skills).toHaveLength(19); // 18 canoniques + 1 post-apo custom

    const blank = createBlankCharacter({ id: 'test-blank', name: 'Lyra' });
    expect(blank.identity.name).toBe('Lyra');
    expect(blank.skills).toHaveLength(18);
    expect(validateCharacterSheet(blank).valid).toBe(true);
  });
});
