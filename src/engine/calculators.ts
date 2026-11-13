/**
 * Calculateurs purs D&D 5e (Édition 2014 + Multi-classage & Compétences personnalisées).
 * Aucune mutation d'état, aucun effet de bord.
 */

import { ABILITY_KEYS, HIT_DIE_SIZES } from './types';
import type {
  AbilityKey,
  AdvantageState,
  AttackEntry,
  CharacterClassEntry,
  CharacterSheetV1,
  CurrencyPurse,
  DerivedAttackStat,
  DerivedCharacterStats,
  DerivedSkillStat,
  DerivedToolStat,
  HitDicePools,
  HitDieSize,
  ProficiencyLevel,
  SkillDefinition,
  ToolProficiency,
} from './types';

/**
 * Calcule le modificateur d'une caractéristique selon la formule officielle 5e : floor((score - 10) / 2).
 */
export function computeAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Formate un modificateur avec son signe explicite (+0, +4, -1).
 */
export function formatSignedModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

/**
 * Calcule le niveau global du personnage (somme des niveaux de toutes ses classes en multi-classage).
 */
export function computeTotalLevel(classes: readonly CharacterClassEntry[]): number {
  const sum = classes.reduce((acc, entry) => acc + Math.max(0, Math.trunc(entry.level)), 0);
  return Math.max(1, sum);
}

/**
 * Calcule le bonus de maîtrise global D&D 5e (de +2 au niveau 1 à +6 au niveau 17+).
 */
export function computeProficiencyBonus(totalLevel: number): number {
  const clampedLevel = Math.min(20, Math.max(1, Math.trunc(totalLevel)));
  return Math.ceil(clampedLevel / 4) + 1;
}

/**
 * Calcule le nombre total attendu de Dés de Vie par taille (d6, d8, d10, d12)
 * à partir des classes du personnage.
 */
export function computeExpectedHitDiceTotals(
  classes: readonly CharacterClassEntry[],
): Record<HitDieSize, number> {
  const totals: Record<HitDieSize, number> = {
    6: 0,
    8: 0,
    10: 0,
    12: 0,
  };

  for (const cls of classes) {
    const level = Math.max(0, Math.trunc(cls.level));
    totals[cls.hitDieSize] += level;
  }

  return totals;
}

/**
 * Synchronise les réserves de Dés de Vie après modification des classes ou des niveaux,
 * en ajoutant les nouveaux dés disponibles lors d'un gain de niveau et en bornant les disponibles.
 */
export function syncHitDicePoolsWithClasses(
  currentPools: HitDicePools,
  nextClasses: readonly CharacterClassEntry[],
): HitDicePools {
  const expectedTotals = computeExpectedHitDiceTotals(nextClasses);
  const nextPools: HitDicePools = {
    6: { total: 0, available: 0 },
    8: { total: 0, available: 0 },
    10: { total: 0, available: 0 },
    12: { total: 0, available: 0 },
  };

  for (const size of HIT_DIE_SIZES) {
    const prev = currentPools[size];
    const nextTotal = expectedTotals[size];
    const gainedDice = Math.max(0, nextTotal - prev.total);
    nextPools[size] = {
      total: nextTotal,
      available: Math.min(nextTotal, Math.max(0, prev.available + gainedDice)),
    };
  }

  return nextPools;
}

/**
 * Calcule le bonus issu du niveau de maîtrise (aucune, demi-maîtrise type Touche-à-tout, maîtrise, expertise).
 */
export function computeProficiencyContribution(
  proficiency: ProficiencyLevel,
  proficiencyBonus: number,
): number {
  switch (proficiency) {
    case 'none':
      return 0;
    case 'half':
      return Math.floor(proficiencyBonus / 2);
    case 'proficient':
      return proficiencyBonus;
    case 'expertise':
      return proficiencyBonus * 2;
  }
}

/**
 * Calcule le modificateur d'un jet de sauvegarde.
 */
export function computeSavingThrowModifier(
  abilityScore: number,
  isProficient: boolean,
  proficiencyBonus: number,
): number {
  const baseMod = computeAbilityModifier(abilityScore);
  return isProficient ? baseMod + proficiencyBonus : baseMod;
}

/**
 * Calcule le modificateur combiné d'un jet basé sur une caractéristique, un niveau de maîtrise et un modificateur fixe.
 */
function computeAbilityProficiencyModifier(
  ability: AbilityKey,
  proficiency: ProficiencyLevel,
  bonusFlat: number,
  abilities: Record<AbilityKey, number>,
  proficiencyBonus: number,
): number {
  const abilityMod = computeAbilityModifier(abilities[ability]);
  const profMod = computeProficiencyContribution(proficiency, proficiencyBonus);
  return abilityMod + profMod + bonusFlat;
}

/**
 * Calcule le modificateur total d'une compétence (standard 5e ou compétence personnalisée post-apo).
 */
export function computeSkillModifier(
  skill: SkillDefinition,
  abilities: Record<AbilityKey, number>,
  proficiencyBonus: number,
): number {
  return computeAbilityProficiencyModifier(
    skill.ability,
    skill.proficiency,
    skill.bonusFlat,
    abilities,
    proficiencyBonus,
  );
}

/**
 * Calcule le modificateur total d'un jet de maîtrise d'outil (caractéristique associée + maîtrise + modificateur divers).
 */
export function computeToolModifier(
  tool: ToolProficiency,
  abilities: Record<AbilityKey, number>,
  proficiencyBonus: number,
): number {
  return computeAbilityProficiencyModifier(
    tool.ability,
    tool.proficiency,
    tool.bonusFlat,
    abilities,
    proficiencyBonus,
  );
}

/**
 * Calcule un score passif (Perception passive, Investigation passive, Perspicacité passive) :
 * 10 + modificateur (+5 si avantage, -5 si désavantage).
 */
export function computePassiveScore(
  skillModifier: number,
  advantage: AdvantageState = 'normal',
): number {
  const advantageOffset =
    advantage === 'advantage' ? 5 : advantage === 'disadvantage' ? -5 : 0;
  return 10 + skillModifier + advantageOffset;
}

/**
 * Calcule le DD de sauvegarde des sorts pour une caractéristique d'incantation donnée :
 * 8 + bonus de maîtrise + modificateur de caractéristique (+ bonus plat éventuel).
 */
export function computeSpellSaveDC(
  abilityScore: number,
  proficiencyBonus: number,
  bonusFlat = 0,
): number {
  return 8 + proficiencyBonus + computeAbilityModifier(abilityScore) + bonusFlat;
}

/**
 * Calcule le bonus d'attaque de sort pour une caractéristique d'incantation donnée :
 * bonus de maîtrise + modificateur de caractéristique (+ bonus plat éventuel).
 */
export function computeSpellAttackBonus(
  abilityScore: number,
  proficiencyBonus: number,
  bonusFlat = 0,
): number {
  return proficiencyBonus + computeAbilityModifier(abilityScore) + bonusFlat;
}

/**
 * Normalise le seuil de coup critique d'un dé d20 entre 1 et 20 (défaut 20).
 */
export function normalizeCritRangeMin(value?: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return 20;
  }
  return Math.min(20, Math.max(1, Math.trunc(value)));
}

/**
 * Calcule le bonus au toucher d'une attaque (arme de mêlée, arme à feu, attaque spéciale).
 */
export function computeAttackRollBonus(
  attack: AttackEntry,
  abilities: Record<AbilityKey, number>,
  proficiencyBonus: number,
): number {
  const abilityMod = computeAbilityModifier(abilities[attack.ability]);
  const profMod = attack.proficient ? proficiencyBonus : 0;
  return abilityMod + profMod + attack.attackBonusFlat;
}

/**
 * Agrège toutes les statistiques dérivées d'une fiche de personnage (vue matérialisée en mémoire).
 */
export function computeDerivedCharacter(sheet: CharacterSheetV1): DerivedCharacterStats {
  const totalLevel = computeTotalLevel(sheet.identity.classes);
  const proficiencyBonus = computeProficiencyBonus(totalLevel);

  const abilityModifiers: Record<AbilityKey, number> = {
    STR: computeAbilityModifier(sheet.abilities.STR),
    DEX: computeAbilityModifier(sheet.abilities.DEX),
    CON: computeAbilityModifier(sheet.abilities.CON),
    INT: computeAbilityModifier(sheet.abilities.INT),
    WIS: computeAbilityModifier(sheet.abilities.WIS),
    CHA: computeAbilityModifier(sheet.abilities.CHA),
  };

  const savingThrows: Record<AbilityKey, { modifier: number; proficient: boolean }> = {
    STR: {
      proficient: sheet.savingThrowProficiencies.STR,
      modifier: computeSavingThrowModifier(
        sheet.abilities.STR,
        sheet.savingThrowProficiencies.STR,
        proficiencyBonus,
      ),
    },
    DEX: {
      proficient: sheet.savingThrowProficiencies.DEX,
      modifier: computeSavingThrowModifier(
        sheet.abilities.DEX,
        sheet.savingThrowProficiencies.DEX,
        proficiencyBonus,
      ),
    },
    CON: {
      proficient: sheet.savingThrowProficiencies.CON,
      modifier: computeSavingThrowModifier(
        sheet.abilities.CON,
        sheet.savingThrowProficiencies.CON,
        proficiencyBonus,
      ),
    },
    INT: {
      proficient: sheet.savingThrowProficiencies.INT,
      modifier: computeSavingThrowModifier(
        sheet.abilities.INT,
        sheet.savingThrowProficiencies.INT,
        proficiencyBonus,
      ),
    },
    WIS: {
      proficient: sheet.savingThrowProficiencies.WIS,
      modifier: computeSavingThrowModifier(
        sheet.abilities.WIS,
        sheet.savingThrowProficiencies.WIS,
        proficiencyBonus,
      ),
    },
    CHA: {
      proficient: sheet.savingThrowProficiencies.CHA,
      modifier: computeSavingThrowModifier(
        sheet.abilities.CHA,
        sheet.savingThrowProficiencies.CHA,
        proficiencyBonus,
      ),
    },
  };

  const skills: DerivedSkillStat[] = sheet.skills.map((skill) => {
    const modifier = computeSkillModifier(skill, sheet.abilities, proficiencyBonus);
    const derived: DerivedSkillStat = {
      id: skill.id,
      name: skill.name,
      ability: skill.ability,
      proficiency: skill.proficiency,
      modifier,
      passive: computePassiveScore(modifier),
      isCustom: skill.isCustom,
    };
    if (skill.originalName !== undefined) {
      derived.originalName = skill.originalName;
    }
    return derived;
  });

  const tools: DerivedToolStat[] = (sheet.toolProficiencies ?? []).map((tool) => {
    const derivedTool: DerivedToolStat = {
      id: tool.id,
      name: tool.name,
      ability: tool.ability,
      proficiency: tool.proficiency,
      modifier: computeToolModifier(tool, sheet.abilities, proficiencyBonus),
    };
    if (tool.originalName !== undefined) {
      derivedTool.originalName = tool.originalName;
    }
    return derivedTool;
  });

  const findSkillPassive = (id: string, fallbackAbility: AbilityKey): number => {
    const found = skills.find((s) => s.id === id);
    if (found !== undefined) {
      return found.passive;
    }
    return computePassiveScore(abilityModifiers[fallbackAbility]);
  };

  const attacks: DerivedAttackStat[] = sheet.attacks.map((attack) => {
    const derivedAtk: DerivedAttackStat = {
      id: attack.id,
      name: attack.name,
      toHitBonus: computeAttackRollBonus(attack, sheet.abilities, proficiencyBonus),
      damageFormula: attack.damageFormula,
      damageType: attack.damageType,
      range: attack.range,
      critRangeMin: normalizeCritRangeMin(attack.critRangeMin),
    };
    if (attack.originalName !== undefined) {
      derivedAtk.originalName = attack.originalName;
    }
    return derivedAtk;
  });

  const spellcastingByAbility: Partial<
    Record<AbilityKey, { saveDC: number; attackBonus: number }>
  > = {};

  const casterAbilities = new Set<AbilityKey>();
  if (sheet.spellcasting !== undefined) {
    casterAbilities.add(sheet.spellcasting.defaultAbility);
    for (const spell of sheet.spellcasting.abilitiesList) {
      if (spell.ability !== undefined) {
        casterAbilities.add(spell.ability);
      }
    }
  }
  for (const cls of sheet.identity.classes) {
    if (cls.spellcastingAbility !== undefined) {
      casterAbilities.add(cls.spellcastingAbility);
    }
  }

  for (const key of ABILITY_KEYS) {
    if (casterAbilities.has(key)) {
      spellcastingByAbility[key] = {
        saveDC: computeSpellSaveDC(sheet.abilities[key], proficiencyBonus),
        attackBonus: computeSpellAttackBonus(sheet.abilities[key], proficiencyBonus),
      };
    }
  }

  const totalWeight =
    Math.round(
      sheet.inventory.reduce(
        (sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.weight),
        0,
      ) * 100,
    ) / 100;
  const carryingCapacityKg = computeCarryingCapacityKg(sheet.abilities.STR);
  const totalWealthGp = computeTotalWealthGp(sheet.currency);

  return {
    totalLevel,
    proficiencyBonus,
    abilityModifiers,
    savingThrows,
    armorClass: sheet.combat.armorClassBase + sheet.combat.armorClassBonus,
    initiative: abilityModifiers.DEX + sheet.combat.initiativeBonusFlat,
    passivePerception: findSkillPassive('perception', 'WIS'),
    passiveInvestigation: findSkillPassive('investigation', 'INT'),
    passiveInsight: findSkillPassive('insight', 'WIS'),
    skills,
    tools,
    attacks,
    spellcastingByAbility,
    totalWeight,
    carryingCapacityKg,
    encumbered: totalWeight > carryingCapacityKg,
    totalWealthGp,
  };
}

/**
 * Calcule la capacité de charge D&D 5e standard en kilogrammes (FOR * 7.5 kg).
 */
export function computeCarryingCapacityKg(strengthScore: number): number {
  return Math.round(Math.max(0, strengthScore) * 7.5 * 100) / 100;
}

/**
 * Calcule la valeur totale de la bourse exprimée en pièces d'or (po),
 * incluant les espèces personnalisées disposant d'un équivalent en po.
 */
export function computeTotalWealthGp(currency?: CurrencyPurse): number {
  if (currency === undefined) {
    return 0;
  }

  const standardGp =
    Math.max(0, currency.pp) * 10 +
    Math.max(0, currency.gp) +
    Math.max(0, currency.ep) * 0.5 +
    Math.max(0, currency.sp) * 0.1 +
    Math.max(0, currency.cp) * 0.01;

  const customGp = (currency.custom ?? []).reduce((sum, entry) => {
    const rate = entry.gpEquivalent;
    if (rate === undefined || !Number.isFinite(rate) || rate <= 0) {
      return sum;
    }
    return sum + Math.max(0, entry.amount) * rate;
  }, 0);

  return Math.round((standardGp + customGp) * 100) / 100;
}
