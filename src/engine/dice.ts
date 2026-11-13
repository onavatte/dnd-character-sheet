/**
 * Moteur de l'Assistant de Jet Hybride (Dé physique saisi par le joueur OU tirage virtuel).
 * Déterministe et injectable pour les tests unitaires.
 */

import { formatSignedModifier, normalizeCritRangeMin } from './calculators';
import type { AdvantageState } from './types';

export interface D20Resolution {
  label: string;
  mode: 'physical' | 'virtual';
  advantage: AdvantageState;
  rolls: number[];
  keptDie: number;
  modifier: number;
  total: number;
  critThreshold: number;
  isCriticalSuccess: boolean;
  isCriticalFailure: boolean;
  formulaBreakdown: string;
}

export interface PhysicalD20Params {
  label: string;
  primaryDie: number;
  secondaryDie?: number;
  advantage?: AdvantageState;
  modifier: number;
  critThreshold?: number;
}

export interface VirtualD20Params {
  label: string;
  advantage?: AdvantageState;
  modifier: number;
  critThreshold?: number;
  rng?: () => number;
}

function validateD20Value(value: number): number {
  const intVal = Math.trunc(value);
  if (intVal < 1 || intVal > 20) {
    throw new RangeError(`La valeur d'un dé d20 doit être comprise entre 1 et 20 (reçu : ${value})`);
  }
  return intVal;
}

function rollSingleDie(sides: number, rng: () => number): number {
  const randomFraction = Math.min(0.999999, Math.max(0, rng()));
  return Math.floor(randomFraction * sides) + 1;
}

function buildD20Resolution(params: {
  label: string;
  mode: 'physical' | 'virtual';
  advantage: AdvantageState;
  rolls: number[];
  keptDie: number;
  modifier: number;
  critThreshold?: number;
}): D20Resolution {
  const { label, mode, advantage, rolls, keptDie, modifier } = params;
  const total = keptDie + modifier;
  const critThreshold = normalizeCritRangeMin(params.critThreshold);
  const isCriticalSuccess = keptDie >= critThreshold;
  const isCriticalFailure = keptDie === 1;

  const rollDisplay =
    rolls.length > 1 ? `[${rolls.join(', ')} -> ${keptDie}]` : `(${keptDie})`;
  const formulaBreakdown = `1d20 ${rollDisplay} ${formatSignedModifier(modifier)} = ${total}`;

  return {
    label,
    mode,
    advantage,
    rolls,
    keptDie,
    modifier,
    total,
    critThreshold,
    isCriticalSuccess,
    isCriticalFailure,
    formulaBreakdown,
  };
}

/**
 * Résout un jet de d20 à partir de la (ou des) valeur(s) de dé physique lancée(s) à la table.
 */
export function resolvePhysicalD20Check(params: PhysicalD20CheckParams): D20Resolution {
  const advantage = params.advantage ?? 'normal';
  const d1 = validateD20Value(params.primaryDie);

  if (advantage === 'normal' || params.secondaryDie === undefined) {
    return buildD20Resolution({
      label: params.label,
      mode: 'physical',
      advantage,
      rolls: [d1],
      keptDie: d1,
      modifier: params.modifier,
      ...(params.critThreshold !== undefined ? { critThreshold: params.critThreshold } : {}),
    });
  }

  const d2 = validateD20Value(params.secondaryDie);
  const keptDie = advantage === 'advantage' ? Math.max(d1, d2) : Math.min(d1, d2);

  return buildD20Resolution({
    label: params.label,
    mode: 'physical',
    advantage,
    rolls: [d1, d2],
    keptDie,
    modifier: params.modifier,
    ...(params.critThreshold !== undefined ? { critThreshold: params.critThreshold } : {}),
  });
}

export type PhysicalD20CheckParams = PhysicalD20Params;

/**
 * Tire un jet de d20 virtuel et calcule le résultat complet.
 */
export function rollVirtualD20Check(params: VirtualD20Params): D20Resolution {
  const advantage = params.advantage ?? 'normal';
  const rng = params.rng ?? Math.random;
  const d1 = rollSingleDie(20, rng);

  if (advantage === 'normal') {
    return buildD20Resolution({
      label: params.label,
      mode: 'virtual',
      advantage,
      rolls: [d1],
      keptDie: d1,
      modifier: params.modifier,
      ...(params.critThreshold !== undefined ? { critThreshold: params.critThreshold } : {}),
    });
  }

  const d2 = rollSingleDie(20, rng);
  const keptDie = advantage === 'advantage' ? Math.max(d1, d2) : Math.min(d1, d2);

  return buildD20Resolution({
    label: params.label,
    mode: 'virtual',
    advantage,
    rolls: [d1, d2],
    keptDie,
    modifier: params.modifier,
    ...(params.critThreshold !== undefined ? { critThreshold: params.critThreshold } : {}),
  });
}

export interface ParsedDamageFormula {
  diceCount: number;
  dieSides: number;
  modifier: number;
}

export interface DamageResolution {
  formula: string;
  isCritical: boolean;
  effectiveDiceCount: number;
  dieSides: number;
  rolls: number[];
  modifier: number;
  total: number;
  formulaBreakdown: string;
}

const DAMAGE_FORMULA_REGEX = /^\s*(\d+)d(\d+)\s*(?:([+-])\s*(\d+))?\s*$/i;

/**
 * Analyse une formule de dégâts simple (ex: "2d6 + 4", "1d10+5", "1d8 - 1", "3d6").
 */
export function parseDamageFormula(formula: string): ParsedDamageFormula {
  const match = DAMAGE_FORMULA_REGEX.exec(formula);
  if (!match) {
    throw new Error(`Formule de dégâts invalide : "${formula}" (attendu ex: "2d6 + 4")`);
  }

  const diceCount = Number(match[1]);
  const dieSides = Number(match[2]);
  const sign = match[3];
  const rawMod = match[4];

  if (diceCount < 1 || dieSides < 2) {
    throw new Error(`Dimensions de dés invalides dans "${formula}"`);
  }

  const modifier =
    rawMod !== undefined ? (sign === '-' ? -Number(rawMod) : Number(rawMod)) : 0;

  return { diceCount, dieSides, modifier };
}

/**
 * Résout une formule de dégâts (en doublant le nombre de dés en cas de coup critique D&D 5e).
 * Accepte soit des jets manuels (dés physiques), soit un tirage virtuel.
 */
export function resolveDamageRoll(
  formula: string,
  options: {
    isCritical?: boolean;
    manualRolls?: readonly number[];
    rng?: () => number;
  } = {},
): DamageResolution {
  const parsed = parseDamageFormula(formula);
  const isCritical = options.isCritical ?? false;
  const effectiveDiceCount = isCritical ? parsed.diceCount * 2 : parsed.diceCount;
  const rng = options.rng ?? Math.random;

  let rolls: number[];
  if (options.manualRolls !== undefined) {
    if (options.manualRolls.length !== effectiveDiceCount) {
      throw new Error(
        `Nombre de dés saisis (${options.manualRolls.length}) différent du nombre attendu (${effectiveDiceCount})`,
      );
    }
    rolls = options.manualRolls.map((val) => {
      const intVal = Math.trunc(val);
      if (intVal < 1 || intVal > parsed.dieSides) {
        throw new RangeError(
          `Valeur de dé (${val}) hors limites pour un d${parsed.dieSides}`,
        );
      }
      return intVal;
    });
  } else {
    rolls = Array.from({ length: effectiveDiceCount }, () =>
      rollSingleDie(parsed.dieSides, rng),
    );
  }

  const diceSum = rolls.reduce((acc, r) => acc + r, 0);
  const total = Math.max(0, diceSum + parsed.modifier);
  const modPart =
    parsed.modifier !== 0 ? ` ${formatSignedModifier(parsed.modifier)}` : '';
  const formulaBreakdown = `${effectiveDiceCount}d${parsed.dieSides} [${rolls.join(' + ')}]${modPart} = ${total}`;

  return {
    formula,
    isCritical,
    effectiveDiceCount,
    dieSides: parsed.dieSides,
    rolls,
    modifier: parsed.modifier,
    total,
    formulaBreakdown,
  };
}
