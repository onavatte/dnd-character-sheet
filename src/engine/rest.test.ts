import { describe, expect, it } from 'vitest';
import { createDemoCharacter } from './glossary';
import {
  applyDamage,
  applyHealing,
  applyLongRest,
  applyShortRest,
  setTemporaryHp,
  updateResourceCurrent,
} from './rest';

describe('Machine à états Survie, Ressources & Repos (rest.ts)', () => {
  it('absorbe les dégâts avec les PV temporaires avant d’entamer les PV actuels', () => {
    const demo = createDemoCharacter(); // hpCurrent: 52, hpTemp: 4
    const afterMinorHit = applyDamage(demo, 3);
    expect(afterMinorHit.combat.hpTemp).toBe(1);
    expect(afterMinorHit.combat.hpCurrent).toBe(52);
    expect(afterMinorHit.revision).toBe(demo.revision + 1);

    const afterHeavyHit = applyDamage(demo, 14); // 4 absorbés par hpTemp, 10 sur hpCurrent
    expect(afterHeavyHit.combat.hpTemp).toBe(0);
    expect(afterHeavyHit.combat.hpCurrent).toBe(42);

    const afterMassiveHit = applyDamage(demo, 200);
    expect(afterMassiveHit.combat.hpCurrent).toBe(0);
  });

  it('soigne jusqu’à hpMax et réinitialise les jets contre la mort si le personnage était à 0 PV', () => {
    const base = createDemoCharacter();
    const downed = {
      ...base,
      combat: {
        ...base.combat,
        hpCurrent: 0,
        deathSaves: { successes: 2, failures: 2 },
      },
    };

    const healed = applyHealing(downed, 12);
    expect(healed.combat.hpCurrent).toBe(12);
    expect(healed.combat.deathSaves).toEqual({ successes: 0, failures: 0 });

    const overhealed = applyHealing(healed, 500);
    expect(overhealed.combat.hpCurrent).toBe(base.combat.hpMax);
  });

  it('applique la règle de non-cumul des PV temporaires (garde le max sauf si overwrite)', () => {
    const demo = createDemoCharacter(); // hpTemp: 4
    expect(setTemporaryHp(demo, 2).combat.hpTemp).toBe(4);
    expect(setTemporaryHp(demo, 8).combat.hpTemp).toBe(8);
    expect(setTemporaryHp(demo, 0, true).combat.hpTemp).toBe(0);
  });

  it('consomme et borne les ressources suivies entre 0 et max', () => {
    const demo = createDemoCharacter();
    const afterShot = updateResourceCurrent(demo, 'res-cells', -2);
    expect(afterShot.resources.find((r) => r.id === 'res-cells')?.current).toBe(3);

    const afterDeplete = updateResourceCurrent(demo, 'res-cells', -99);
    expect(afterDeplete.resources.find((r) => r.id === 'res-cells')?.current).toBe(0);
  });

  it('gère le Repos Court : dépense de Dés de Vie par taille, soins, ressources short_rest et emplacements de Pacte', () => {
    const base = createDemoCharacter();
    const hurtSheet = {
      ...base,
      combat: {
        ...base.combat,
        hpCurrent: 35,
      },
      resources: base.resources.map((r) => ({ ...r, current: 0 })),
      spellcasting: {
        defaultAbility: 'WIS' as const,
        slots: { 1: { max: 4, used: 1 } },
        abilitiesList: [],
        pactSlots: { level: 2, max: 2, used: 2 },
      },
    };

    const afterShortRest = applyShortRest(hurtSheet, {
      hitDiceSpent: { 10: 2, 8: 1 },
      healingRolled: 18,
    });

    expect(afterShortRest.combat.hpCurrent).toBe(53); // 35 + 18
    expect(afterShortRest.combat.hitDicePools[10].available).toBe(2); // 4 - 2
    expect(afterShortRest.combat.hitDicePools[8].available).toBe(1); // 2 - 1
    // 'short_rest' rechargé, mais 'long_rest' et 'manual' restent à 0
    expect(afterShortRest.resources.find((r) => r.id === 'res-stim')?.current).toBe(1);
    expect(afterShortRest.resources.find((r) => r.id === 'res-veil')?.current).toBe(0);
    expect(afterShortRest.resources.find((r) => r.id === 'res-cells')?.current).toBe(0);
    expect(afterShortRest.spellcasting?.pactSlots?.used).toBe(0);
  });

  it('gère le Repos Long : PV max, récupération de floor(total/2) Dés de Vie (priorité aux plus gros dés), sorts et épuisement -1', () => {
    const base = createDemoCharacter(); // 5d10 + 2d8 = 7 Dés de Vie au total -> récupère floor(7/2) = 3 dés
    const exhaustedSheet = {
      ...base,
      combat: {
        ...base.combat,
        hpCurrent: 12,
        hpTemp: 6,
        exhaustionLevel: 2 as const,
        hitDicePools: {
          6: { total: 0, available: 0 },
          8: { total: 2, available: 0 }, // 2 d8 dépensés
          10: { total: 5, available: 1 }, // 4 d10 dépensés
          12: { total: 0, available: 0 },
        },
      },
      resources: base.resources.map((r) => ({ ...r, current: 0 })),
    };

    const afterLongRest = applyLongRest(exhaustedSheet);

    expect(afterLongRest.combat.hpCurrent).toBe(base.combat.hpMax);
    expect(afterLongRest.combat.hpTemp).toBe(0);
    expect(afterLongRest.combat.exhaustionLevel).toBe(1);
    // Récupère 3 Dés de Vie en commençant par les d10 : d10 passe de 1 à 4, d8 reste à 0
    expect(afterLongRest.combat.hitDicePools[10].available).toBe(4);
    expect(afterLongRest.combat.hitDicePools[8].available).toBe(0);
    // Ressources short_rest et long_rest rechargées, ressource manual inchangée
    expect(afterLongRest.resources.find((r) => r.id === 'res-stim')?.current).toBe(1);
    expect(afterLongRest.resources.find((r) => r.id === 'res-veil')?.current).toBe(3);
    expect(afterLongRest.resources.find((r) => r.id === 'res-cells')?.current).toBe(0);
    expect(afterLongRest.spellcasting?.slots[1]?.used).toBe(0);
  });
});
