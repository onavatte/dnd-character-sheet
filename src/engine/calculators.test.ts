import { describe, expect, it } from 'vitest';
import {
  computeAbilityModifier,
  computeAttackRollBonus,
  computeDerivedCharacter,
  computeExpectedHitDiceTotals,
  computePassiveScore,
  computeProficiencyBonus,
  computeSavingThrowModifier,
  computeSkillModifier,
  computeSpellAttackBonus,
  computeSpellSaveDC,
  computeTotalLevel,
  formatSignedModifier,
} from './calculators';
import { createDemoCharacter } from './glossary';
import type { SkillDefinition } from './types';

describe('Calculateurs purs D&D 5e (calculators.ts)', () => {
  it('calcule les modificateurs de caractéristiques de 1 à 30', () => {
    expect(computeAbilityModifier(1)).toBe(-5);
    expect(computeAbilityModifier(8)).toBe(-1);
    expect(computeAbilityModifier(10)).toBe(0);
    expect(computeAbilityModifier(11)).toBe(0);
    expect(computeAbilityModifier(15)).toBe(2);
    expect(computeAbilityModifier(18)).toBe(4);
    expect(computeAbilityModifier(20)).toBe(5);
    expect(computeAbilityModifier(30)).toBe(10);
  });

  it('formate les modificateurs avec signe explicite', () => {
    expect(formatSignedModifier(-2)).toBe('-2');
    expect(formatSignedModifier(0)).toBe('+0');
    expect(formatSignedModifier(5)).toBe('+5');
  });

  it('calcule le niveau global et le bonus de maîtrise en multi-classage', () => {
    const demo = createDemoCharacter();
    // Rôdeur 5 + Roublard 2 = Niveau global 7 -> Maîtrise +3
    const totalLevel = computeTotalLevel(demo.identity.classes);
    expect(totalLevel).toBe(7);
    expect(computeProficiencyBonus(totalLevel)).toBe(3);

    expect(computeProficiencyBonus(1)).toBe(2);
    expect(computeProficiencyBonus(4)).toBe(2);
    expect(computeProficiencyBonus(5)).toBe(3);
    expect(computeProficiencyBonus(9)).toBe(4);
    expect(computeProficiencyBonus(13)).toBe(5);
    expect(computeProficiencyBonus(17)).toBe(6);
    expect(computeProficiencyBonus(20)).toBe(6);
  });

  it('calcule les totaux de Dés de Vie par taille pour un personnage multi-classé', () => {
    const demo = createDemoCharacter();
    expect(computeExpectedHitDiceTotals(demo.identity.classes)).toEqual({
      6: 0,
      8: 2,
      10: 5,
      12: 0,
    });
  });

  it('calcule les compétences avec aucune maîtrise, demi-maîtrise, maîtrise, expertise et bonus plat', () => {
    const abilities = { STR: 10, DEX: 18, CON: 14, INT: 14, WIS: 16, CHA: 10 };
    const pb = 3; // Niveau 7

    const makeSkill = (
      proficiency: SkillDefinition['proficiency'],
      bonusFlat = 0,
    ): SkillDefinition => ({
      id: 'test',
      name: 'Test',
      ability: 'DEX',
      proficiency,
      bonusFlat,
      isCustom: false,
    });

    expect(computeSkillModifier(makeSkill('none'), abilities, pb)).toBe(4);
    expect(computeSkillModifier(makeSkill('half'), abilities, pb)).toBe(5); // 4 + floor(3/2)
    expect(computeSkillModifier(makeSkill('proficient'), abilities, pb)).toBe(7); // 4 + 3
    expect(computeSkillModifier(makeSkill('expertise'), abilities, pb)).toBe(10); // 4 + 6
    expect(computeSkillModifier(makeSkill('proficient', 2), abilities, pb)).toBe(9);
  });

  it('calcule les scores passifs avec normal, avantage (+5) et désavantage (-5)', () => {
    expect(computePassiveScore(6, 'normal')).toBe(16);
    expect(computePassiveScore(6, 'advantage')).toBe(21);
    expect(computePassiveScore(6, 'disadvantage')).toBe(11);
  });

  it('calcule les jets de sauvegarde, bonus d’attaque et DD de sorts', () => {
    expect(computeSavingThrowModifier(18, true, 3)).toBe(7);
    expect(computeSavingThrowModifier(16, false, 3)).toBe(3);
    expect(computeSpellSaveDC(16, 3)).toBe(14); // 8 + 3 + 3
    expect(computeSpellAttackBonus(16, 3)).toBe(6); // 3 + 3

    const demo = createDemoCharacter();
    const carbine = demo.attacks[0];
    expect(carbine).toBeDefined();
    if (carbine) {
      // DEX 18 (+4) + Maîtrise (+3) + Bonus arme (+1) = +8
      expect(computeAttackRollBonus(carbine, demo.abilities, 3)).toBe(8);
    }
  });

  it('agrège l’ensemble des statistiques dérivées de la fiche démo (computeDerivedCharacter)', () => {
    const demo = createDemoCharacter();
    const derived = computeDerivedCharacter(demo);

    expect(derived.totalLevel).toBe(7);
    expect(derived.proficiencyBonus).toBe(3);
    expect(derived.armorClass).toBe(17); // 16 + 1
    expect(derived.initiative).toBe(7); // DEX +4 + 3 (Traqueur)
    // Perception : SAG 16 (+3) + Expertise (+6) = +9 -> Passive 19
    expect(derived.passivePerception).toBe(19);
    // Investigation : INT 14 (+2) + Maîtrise (+3) = +5 -> Passive 15
    expect(derived.passiveInvestigation).toBe(15);
    expect(derived.spellcastingByAbility.WIS).toEqual({
      saveDC: 14,
      attackBonus: 6,
    });
    expect(derived.totalWeight).toBe(7.5);

    const hacking = derived.skills.find((s) => s.id === 'custom_hacking');
    // INT 14 (+2) + Maîtrise (+3) + bonusFlat (+1) = +6
    expect(hacking?.modifier).toBe(6);

    const demoCantrip = demo.spellcasting?.abilitiesList.find(
      (s) => s.level === 0 && s.hasAttackRoll,
    );
    expect(demoCantrip?.damageFormula).toBe('2d10');
  });

  it('calcule aussi la caractéristique spécifique de sorts offensifs multiclassés', () => {
    const sheet = createDemoCharacter();
    sheet.spellcasting?.abilitiesList.push({
      id: 'spell-eldritch-blast',
      level: 0,
      name: 'Décharge occulte',
      originalName: 'Eldritch Blast',
      ability: 'CHA',
      prepared: true,
      castingTime: '1 action',
      range: '36 m',
      hasAttackRoll: true,
      damageFormula: '1d10',
      damageType: 'Force',
      description: 'Rayon énergétique de pacte.',
    });

    const derived = computeDerivedCharacter(sheet);
    // CHA 10 (+0) + Maîtrise (+3) -> DD 11, Attaque +3
    expect(derived.spellcastingByAbility.CHA).toEqual({
      saveDC: 11,
      attackBonus: 3,
    });
  });
});
