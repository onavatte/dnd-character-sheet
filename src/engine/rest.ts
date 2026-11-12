/**
 * Machine à états pure pour la survie, les ressources et les repos (Repos Court / Repos Long)
 * selon les règles D&D 5e (2014). Toutes les fonctions retournent un nouvel état immuable.
 */

import type { CharacterSheetV1, HitDicePools, HitDieSize } from './types';

const HIT_DIE_RECOVERY_PRIORITY: readonly HitDieSize[] = [12, 10, 8, 6] as const;

function bumpMetadata(
  sheet: CharacterSheetV1,
  nowIso = new Date().toISOString(),
): Pick<CharacterSheetV1, 'revision' | 'updatedAt'> {
  return {
    revision: sheet.revision + 1,
    updatedAt: nowIso,
  };
}

/**
 * Applique des dégâts en absorbant d'abord les PV temporaires (hpTemp),
 * puis en réduisant les PV actuels (hpCurrent) avec un plancher à 0.
 */
export function applyDamage(
  sheet: CharacterSheetV1,
  rawDamage: number,
  nowIso?: string,
): CharacterSheetV1 {
  const damage = Math.max(0, Math.trunc(rawDamage));
  if (damage === 0) {
    return sheet;
  }

  const absorbedByTemp = Math.min(sheet.combat.hpTemp, damage);
  const remainingDamage = damage - absorbedByTemp;
  const nextHpTemp = sheet.combat.hpTemp - absorbedByTemp;
  const nextHpCurrent = Math.max(0, sheet.combat.hpCurrent - remainingDamage);

  return {
    ...sheet,
    ...bumpMetadata(sheet, nowIso),
    combat: {
      ...sheet.combat,
      hpTemp: nextHpTemp,
      hpCurrent: nextHpCurrent,
    },
  };
}

/**
 * Applique des soins jusqu'au plafond hpMax.
 * Si le personnage était à 0 PV et reçoit des soins (> 0), réinitialise ses jets contre la mort.
 */
export function applyHealing(
  sheet: CharacterSheetV1,
  rawHealing: number,
  nowIso?: string,
): CharacterSheetV1 {
  const healing = Math.max(0, Math.trunc(rawHealing));
  if (healing === 0) {
    return sheet;
  }

  const wasAtZero = sheet.combat.hpCurrent === 0;
  const nextHpCurrent = Math.min(sheet.combat.hpMax, sheet.combat.hpCurrent + healing);

  return {
    ...sheet,
    ...bumpMetadata(sheet, nowIso),
    combat: {
      ...sheet.combat,
      hpCurrent: nextHpCurrent,
      deathSaves: wasAtZero
        ? { successes: 0, failures: 0 }
        : sheet.combat.deathSaves,
    },
  };
}

/**
 * Définit les PV temporaires selon la règle D&D 5e : les PV temporaires ne se cumulent pas,
 * on conserve la valeur la plus élevée (sauf si overwrite = true pour forcer la valeur).
 */
export function setTemporaryHp(
  sheet: CharacterSheetV1,
  tempHp: number,
  overwrite = false,
  nowIso?: string,
): CharacterSheetV1 {
  const sanitized = Math.max(0, Math.trunc(tempHp));
  const nextHpTemp = overwrite ? sanitized : Math.max(sheet.combat.hpTemp, sanitized);

  return {
    ...sheet,
    ...bumpMetadata(sheet, nowIso),
    combat: {
      ...sheet.combat,
      hpTemp: nextHpTemp,
    },
  };
}

/**
 * Consomme ou restaure une ressource suivie (munitions, charges de classe, points de Ki).
 */
export function updateResourceCurrent(
  sheet: CharacterSheetV1,
  resourceId: string,
  delta: number,
  nowIso?: string,
): CharacterSheetV1 {
  const resourceIndex = sheet.resources.findIndex((r) => r.id === resourceId);
  if (resourceIndex === -1) {
    return sheet;
  }

  const nextResources = sheet.resources.map((res) => {
    if (res.id !== resourceId) return res;
    const clamped = Math.min(res.max, Math.max(0, res.current + Math.trunc(delta)));
    return { ...res, current: clamped };
  });

  return {
    ...sheet,
    ...bumpMetadata(sheet, nowIso),
    resources: nextResources,
  };
}

export interface ShortRestOptions {
  hitDiceSpent?: Partial<Record<HitDieSize, number>>;
  healingRolled?: number;
  nowIso?: string;
}

/**
 * Exécute un Repos Court (Short Rest) :
 * 1. Décrémente les Dés de Vie dépensés par réserve (d6, d8, d10, d12).
 * 2. Ajoute les PV regagnés (healingRolled) jusqu'à hpMax.
 * 3. Recharge toutes les ressources à récupération 'short_rest'.
 * 4. Recharge les emplacements de Magie de Pacte (pactSlots) s'ils existent.
 */
export function applyShortRest(
  sheet: CharacterSheetV1,
  options: ShortRestOptions = {},
): CharacterSheetV1 {
  const nextPools: HitDicePools = {
    6: { ...sheet.combat.hitDicePools[6] },
    8: { ...sheet.combat.hitDicePools[8] },
    10: { ...sheet.combat.hitDicePools[10] },
    12: { ...sheet.combat.hitDicePools[12] },
  };

  if (options.hitDiceSpent !== undefined) {
    for (const size of HIT_DIE_RECOVERY_PRIORITY) {
      const requested = Math.max(0, Math.trunc(options.hitDiceSpent[size] ?? 0));
      const pool = nextPools[size];
      const actualSpent = Math.min(pool.available, requested);
      nextPools[size] = {
        ...pool,
        available: pool.available - actualSpent,
      };
    }
  }

  const healing = Math.max(0, Math.trunc(options.healingRolled ?? 0));
  const nextHpCurrent = Math.min(sheet.combat.hpMax, sheet.combat.hpCurrent + healing);

  const nextResources = sheet.resources.map((res) =>
    res.recovery === 'short_rest' ? { ...res, current: res.max } : res,
  );

  let nextSpellcasting = sheet.spellcasting;
  if (sheet.spellcasting !== undefined && sheet.spellcasting.pactSlots !== undefined) {
    nextSpellcasting = {
      ...sheet.spellcasting,
      pactSlots: {
        ...sheet.spellcasting.pactSlots,
        used: 0,
      },
    };
  }

  const updated: CharacterSheetV1 = {
    ...sheet,
    ...bumpMetadata(sheet, options.nowIso),
    combat: {
      ...sheet.combat,
      hpCurrent: nextHpCurrent,
      hitDicePools: nextPools,
      deathSaves: nextHpCurrent > 0 ? { successes: 0, failures: 0 } : sheet.combat.deathSaves,
    },
    resources: nextResources,
  };

  if (nextSpellcasting !== undefined) {
    updated.spellcasting = nextSpellcasting;
  }

  return updated;
}

/**
 * Exécute un Repos Long (Long Rest) selon les règles D&D 5e (2014) :
 * 1. Restaure tous les PV (hpCurrent = hpMax) et efface les PV temporaires (hpTemp = 0).
 * 2. Réinitialise les jets contre la mort.
 * 3. Récupère jusqu'à la moitié du nombre total de Dés de Vie (minimum 1), en priorisant
 *    les plus gros dés dépensés (d12 -> d10 -> d8 -> d6) pour avantager le joueur multi-classé.
 * 4. Réinitialise toutes les ressources 'short_rest' et 'long_rest'.
 * 5. Réinitialise tous les emplacements de sorts (standards 1-9 et pactSlots).
 * 6. Réduit le niveau d'épuisement de 1 (si > 0).
 */
export function applyLongRest(
  sheet: CharacterSheetV1,
  nowIso?: string,
): CharacterSheetV1 {
  const nextPools: HitDicePools = {
    6: { ...sheet.combat.hitDicePools[6] },
    8: { ...sheet.combat.hitDicePools[8] },
    10: { ...sheet.combat.hitDicePools[10] },
    12: { ...sheet.combat.hitDicePools[12] },
  };

  const totalHitDice =
    nextPools[6].total + nextPools[8].total + nextPools[10].total + nextPools[12].total;

  let remainingToRecover =
    totalHitDice > 0 ? Math.max(1, Math.floor(totalHitDice / 2)) : 0;

  for (const size of HIT_DIE_RECOVERY_PRIORITY) {
    if (remainingToRecover <= 0) break;
    const pool = nextPools[size];
    const missing = Math.max(0, pool.total - pool.available);
    if (missing > 0) {
      const recovered = Math.min(missing, remainingToRecover);
      nextPools[size] = {
        ...pool,
        available: pool.available + recovered,
      };
      remainingToRecover -= recovered;
    }
  }

  const nextExhaustion = Math.max(0, sheet.combat.exhaustionLevel - 1) as
    | 0
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6;

  const nextResources = sheet.resources.map((res) =>
    res.recovery === 'short_rest' || res.recovery === 'long_rest'
      ? { ...res, current: res.max }
      : res,
  );

  let nextSpellcasting = sheet.spellcasting;
  if (sheet.spellcasting !== undefined) {
    const resetSlots: Record<number, { max: number; used: number }> = {};
    for (const [levelKey, slot] of Object.entries(sheet.spellcasting.slots)) {
      resetSlots[Number(levelKey)] = { max: slot.max, used: 0 };
    }

    nextSpellcasting = {
      ...sheet.spellcasting,
      slots: resetSlots,
    };

    if (sheet.spellcasting.pactSlots !== undefined) {
      nextSpellcasting.pactSlots = {
        ...sheet.spellcasting.pactSlots,
        used: 0,
      };
    }
  }

  const updated: CharacterSheetV1 = {
    ...sheet,
    ...bumpMetadata(sheet, nowIso),
    combat: {
      ...sheet.combat,
      hpCurrent: sheet.combat.hpMax,
      hpTemp: 0,
      hitDicePools: nextPools,
      deathSaves: { successes: 0, failures: 0 },
      exhaustionLevel: nextExhaustion,
    },
    resources: nextResources,
  };

  if (nextSpellcasting !== undefined) {
    updated.spellcasting = nextSpellcasting;
  }

  return updated;
}
