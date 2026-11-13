import { describe, expect, it } from 'vitest';
import {
  parseDamageFormula,
  resolveDamageRoll,
  resolvePhysicalD20Check,
  rollVirtualD20Check,
} from './dice';

describe('Assistant de Jet Hybride - Physique & Virtuel (dice.ts)', () => {
  it('résout un jet de dé physique d20 avec modificateur et détecte les critiques (1 et 20)', () => {
    const normal = resolvePhysicalD20Check({
      label: 'Discrétion (Stealth)',
      primaryDie: 14,
      modifier: 10,
    });
    expect(normal.total).toBe(24);
    expect(normal.isCriticalSuccess).toBe(false);
    expect(normal.isCriticalFailure).toBe(false);
    expect(normal.formulaBreakdown).toBe('1d20 (14) +10 = 24');

    const crit = resolvePhysicalD20Check({
      label: 'Carabine magnétique',
      primaryDie: 20,
      modifier: 8,
    });
    expect(crit.isCriticalSuccess).toBe(true);
    expect(crit.total).toBe(28);

    const fumble = resolvePhysicalD20Check({
      label: 'Athlétisme',
      primaryDie: 1,
      modifier: 4,
    });
    expect(fumble.isCriticalFailure).toBe(true);
    expect(fumble.total).toBe(5);
  });

  it('gère l’Avantage et le Désavantage en mode dé physique', () => {
    const adv = resolvePhysicalD20Check({
      label: 'Perception',
      primaryDie: 7,
      secondaryDie: 18,
      advantage: 'advantage',
      modifier: 9,
    });
    expect(adv.keptDie).toBe(18);
    expect(adv.total).toBe(27);

    const disadv = resolvePhysicalD20Check({
      label: 'Discrétion',
      primaryDie: 7,
      secondaryDie: 18,
      advantage: 'disadvantage',
      modifier: 10,
    });
    expect(disadv.keptDie).toBe(7);
    expect(disadv.total).toBe(17);
  });

  it('rejette une valeur de d20 hors de la plage 1..20', () => {
    expect(() =>
      resolvePhysicalD20Check({ label: 'Test', primaryDie: 0, modifier: 2 }),
    ).toThrow(RangeError);
    expect(() =>
      resolvePhysicalD20Check({ label: 'Test', primaryDie: 21, modifier: 2 }),
    ).toThrow(RangeError);
  });

  it('résout un jet virtuel avec générateur aléatoire déterministe injecté', () => {
    const rolls = [0.45, 0.95]; // 0.45 * 20 + 1 = 10 ; 0.95 * 20 + 1 = 20
    let idx = 0;
    const rng = () => rolls[idx++] ?? 0;

    const result = rollVirtualD20Check({
      label: 'Attaque',
      advantage: 'advantage',
      modifier: 7,
      rng,
    });

    expect(result.rolls).toEqual([10, 20]);
    expect(result.keptDie).toBe(20);
    expect(result.isCriticalSuccess).toBe(true);
    expect(result.total).toBe(27);
  });

  it('analyse et résout les formules de dégâts (normales et critiques avec doublement des dés)', () => {
    expect(parseDamageFormula('2d6 + 4')).toEqual({
      diceCount: 2,
      dieSides: 6,
      modifier: 4,
    });

    const manualNormal = resolveDamageRoll('1d10 + 5', {
      manualRolls: [7],
    });
    expect(manualNormal.total).toBe(12);
    expect(manualNormal.formulaBreakdown).toBe('1d10 [7] +5 = 12');

    const manualCrit = resolveDamageRoll('1d10 + 5', {
      isCritical: true,
      manualRolls: [7, 9],
    });
    expect(manualCrit.effectiveDiceCount).toBe(2);
    expect(manualCrit.total).toBe(21);
  });

  it('prend en charge les plages de critique étendues (ex. 19-20) en physique et virtuel', () => {
    const critOn19 = resolvePhysicalD20Check({
      label: 'Vibro-lame tactique',
      primaryDie: 19,
      modifier: 7,
      critThreshold: 19,
    });
    expect(critOn19.critThreshold).toBe(19);
    expect(critOn19.isCriticalSuccess).toBe(true);
    expect(critOn19.total).toBe(26);

    const missOn18 = resolvePhysicalD20Check({
      label: 'Vibro-lame tactique',
      primaryDie: 18,
      modifier: 7,
      critThreshold: 19,
    });
    expect(missOn18.isCriticalSuccess).toBe(false);

    // 0.90 * 20 + 1 = 19 (critique sur plage 19-20)
    const virtualCrit19 = rollVirtualD20Check({
      label: 'Vibro-lame tactique',
      modifier: 7,
      critThreshold: 19,
      rng: () => 0.9,
    });
    expect(virtualCrit19.keptDie).toBe(19);
    expect(virtualCrit19.isCriticalSuccess).toBe(true);
    expect(virtualCrit19.critThreshold).toBe(19);
  });
});
