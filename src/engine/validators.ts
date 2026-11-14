/**
 * Validation stricte aux frontières (IndexedDB / Import de sauvegarde JSON).
 * Protège l'application contre les fichiers JSON malformés, tronqués ou corrompus.
 */

import {
  ABILITY_KEYS,
  CREATURE_SIZES,
  FEATURE_CATEGORIES,
  HIT_DIE_SIZES,
  INVENTORY_CATEGORIES,
  NOTE_CATEGORIES,
  RESOURCE_CATEGORIES,
  STANDARD_CURRENCY_KEYS,
} from './types';
import type {
  AbilityKey,
  CharacterSheetV1,
  CreatureSize,
  FeatureCategory,
  InventoryCategory,
  NoteCategory,
  ResourceCategory,
} from './types';

export type ValidationResult =
  | { valid: true; data: CharacterSheetV1 }
  | { valid: false; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Valide qu'un payload inconnu (issu d'un import JSON ou d'IndexedDB) respecte
 * la structure et les invariants de sécurité de CharacterSheetV1.
 */
export function validateCharacterSheet(payload: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isRecord(payload)) {
    return {
      valid: false,
      errors: ['Le contenu fourni n’est pas un objet JSON valide.'],
    };
  }

  if (payload['schemaVersion'] !== 1) {
    errors.push(
      `Version de schéma non supportée (${String(payload['schemaVersion'])}). Attendu : 1.`,
    );
  }

  if (!isNonEmptyString(payload['id'])) {
    errors.push('L’identifiant du personnage (id) est manquant ou invalide.');
  }

  if (!isFiniteNumber(payload['revision']) || payload['revision'] < 1) {
    errors.push('Le numéro de révision (revision) doit être un entier >= 1.');
  }

  const identity = payload['identity'];
  if (!isRecord(identity)) {
    errors.push('La section identity est manquante.');
  } else {
    if (!isNonEmptyString(identity['name'])) {
      errors.push('Le nom du personnage (identity.name) est obligatoire.');
    }
    if (
      typeof identity['race'] !== 'string' ||
      typeof identity['subrace'] !== 'string' ||
      typeof identity['heritage'] !== 'string' ||
      typeof identity['creatureType'] !== 'string' ||
      typeof identity['alignment'] !== 'string' ||
      typeof identity['deityOrPatron'] !== 'string'
    ) {
      errors.push(
        'Les champs d’identité (race, subrace, heritage, creatureType, alignment, deityOrPatron) doivent être des chaînes.',
      );
    }
    if (!CREATURE_SIZES.includes(identity['size'] as CreatureSize)) {
      errors.push(
        'La catégorie de taille (identity.size) doit être TP, P, M, G, TG ou Gig.',
      );
    }
    if (typeof identity['backstory'] !== 'string') {
      errors.push(
        'Le background du personnage (identity.backstory) doit être une chaîne de caractères.',
      );
    }
    if (
      identity['portraitDataUrl'] !== undefined &&
      (typeof identity['portraitDataUrl'] !== 'string' ||
        !identity['portraitDataUrl'].startsWith('data:image/'))
    ) {
      errors.push(
        'Le portrait du personnage (identity.portraitDataUrl) doit être une Data URL image valide (data:image/...).',
      );
    }
    const classes = identity['classes'];
    if (!Array.isArray(classes) || classes.length === 0) {
      errors.push(
        'Le personnage doit posséder au moins une classe dans identity.classes.',
      );
    } else {
      classes.forEach((cls, idx) => {
        if (!isRecord(cls)) {
          errors.push(`La classe à l'index ${idx} est invalide.`);
          return;
        }
        if (!isNonEmptyString(cls['name'])) {
          errors.push(`Le nom de la classe à l'index ${idx} est manquant.`);
        }
        if (!isFiniteNumber(cls['level']) || cls['level'] < 1 || cls['level'] > 20) {
          errors.push(
            `Le niveau de la classe "${String(cls['name'])}" doit être compris entre 1 et 20.`,
          );
        }
        if (!HIT_DIE_SIZES.includes(cls['hitDieSize'] as 6 | 8 | 10 | 12)) {
          errors.push(
            `Taille de dé de vie invalide pour la classe "${String(cls['name'])}" (attendu : 6, 8, 10 ou 12).`,
          );
        }
      });
    }
  }

  const abilities = payload['abilities'];
  if (!isRecord(abilities)) {
    errors.push('La section abilities est manquante.');
  } else {
    for (const key of ABILITY_KEYS) {
      const score = abilities[key];
      if (!isFiniteNumber(score) || score < 1 || score > 30) {
        errors.push(
          `Le score de caractéristique ${key} doit être un nombre compris entre 1 et 30.`,
        );
      }
    }
  }

  const combat = payload['combat'];
  if (!isRecord(combat)) {
    errors.push('La section combat est manquante.');
  } else {
    if (!isFiniteNumber(combat['hpMax']) || combat['hpMax'] < 1) {
      errors.push('Les PV maximum (combat.hpMax) doivent être >= 1.');
    }
    if (!isFiniteNumber(combat['hpCurrent']) || combat['hpCurrent'] < 0) {
      errors.push('Les PV actuels (combat.hpCurrent) doivent être >= 0.');
    }
    const pools = combat['hitDicePools'];
    if (!isRecord(pools)) {
      errors.push('Les réserves de dés de vie (combat.hitDicePools) sont manquantes.');
    } else {
      for (const size of HIT_DIE_SIZES) {
        const pool = pools[String(size)];
        if (
          !isRecord(pool) ||
          !isFiniteNumber(pool['total']) ||
          !isFiniteNumber(pool['available'])
        ) {
          errors.push(`La réserve de dés de vie d${size} est invalide.`);
        }
      }
    }
  }

  if (!Array.isArray(payload['skills'])) {
    errors.push('La liste des compétences (skills) doit être un tableau.');
  }

  if (
    payload['toolProficiencies'] !== undefined &&
    !Array.isArray(payload['toolProficiencies'])
  ) {
    errors.push(
      'La liste des maîtrises d’outils (toolProficiencies) doit être un tableau.',
    );
  }

  if (payload['languages'] !== undefined && !Array.isArray(payload['languages'])) {
    errors.push('La liste des langues (languages) doit être un tableau.');
  }

  if (!Array.isArray(payload['resources'])) {
    errors.push('La liste des ressources (resources) doit être un tableau.');
  } else {
    payload['resources'].forEach((rawRes, index) => {
      if (!isRecord(rawRes)) {
        errors.push(`La ressource #${index + 1} est invalide.`);
        return;
      }
      if (!isNonEmptyString(rawRes['id']) || !isNonEmptyString(rawRes['name'])) {
        errors.push(`La ressource #${index + 1} doit avoir un id et un nom.`);
      }
      if (!isFiniteNumber(rawRes['current']) || rawRes['current'] < 0) {
        errors.push(`La valeur actuelle de la ressource #${index + 1} doit être >= 0.`);
      }
      if (!isFiniteNumber(rawRes['max']) || rawRes['max'] < 0) {
        errors.push(`La valeur maximale de la ressource #${index + 1} doit être >= 0.`);
      }
      if (
        rawRes['category'] !== undefined &&
        (typeof rawRes['category'] !== 'string' ||
          !RESOURCE_CATEGORIES.includes(rawRes['category'] as ResourceCategory))
      ) {
        errors.push(`Catégorie invalide pour la ressource #${index + 1}.`);
      }
      for (const optTextKey of [
        'castingTime',
        'range',
        'description',
        'damageFormula',
        'damageType',
      ] as const) {
        if (
          rawRes[optTextKey] !== undefined &&
          typeof rawRes[optTextKey] !== 'string'
        ) {
          errors.push(`Champ "${optTextKey}" invalide pour la ressource #${index + 1}.`);
        }
      }
      for (const optAbilKey of ['ability', 'saveAbility'] as const) {
        if (
          rawRes[optAbilKey] !== undefined &&
          (typeof rawRes[optAbilKey] !== 'string' ||
            !ABILITY_KEYS.includes(rawRes[optAbilKey] as AbilityKey))
        ) {
          errors.push(
            `Caractéristique "${optAbilKey}" invalide pour la ressource #${index + 1}.`,
          );
        }
      }
      if (
        rawRes['hasAttackRoll'] !== undefined &&
        typeof rawRes['hasAttackRoll'] !== 'boolean'
      ) {
        errors.push(`Champ "hasAttackRoll" invalide pour la ressource #${index + 1}.`);
      }
      if (
        rawRes['fixedSaveDC'] !== undefined &&
        (!isFiniteNumber(rawRes['fixedSaveDC']) ||
          rawRes['fixedSaveDC'] < 1 ||
          rawRes['fixedSaveDC'] > 99)
      ) {
        errors.push(`DD fixe invalide pour la ressource #${index + 1} (attendu 1..99).`);
      }
      if (
        rawRes['critRangeMin'] !== undefined &&
        (!isFiniteNumber(rawRes['critRangeMin']) ||
          rawRes['critRangeMin'] < 1 ||
          rawRes['critRangeMin'] > 20)
      ) {
        errors.push(
          `Seuil critique invalide pour la ressource #${index + 1} (attendu 1..20).`,
        );
      }
    });
  }

  if (!Array.isArray(payload['attacks'])) {
    errors.push('La liste des attaques (attacks) doit être un tableau.');
  }

  if (!Array.isArray(payload['inventory'])) {
    errors.push('L’inventaire (inventory) doit être un tableau.');
  } else {
    payload['inventory'].forEach((rawItem, index) => {
      if (!isRecord(rawItem)) {
        errors.push(`L’objet d’inventaire #${index + 1} est invalide.`);
        return;
      }
      if (
        rawItem['category'] !== undefined &&
        (typeof rawItem['category'] !== 'string' ||
          !INVENTORY_CATEGORIES.includes(rawItem['category'] as InventoryCategory))
      ) {
        errors.push(`Catégorie invalide pour l’objet d’inventaire #${index + 1}.`);
      }
    });
  }

  const currency = payload['currency'];
  if (currency !== undefined) {
    if (!isRecord(currency)) {
      errors.push('La bourse (currency) doit être un objet.');
    } else {
      for (const coin of STANDARD_CURRENCY_KEYS) {
        const val = currency[coin];
        if (!isFiniteNumber(val) || val < 0) {
          errors.push(`Le montant de monnaie ${coin} doit être un nombre >= 0.`);
        }
      }
      const custom = currency['custom'];
      if (custom !== undefined) {
        if (!Array.isArray(custom)) {
          errors.push('Les espèces personnalisées (currency.custom) doivent être un tableau.');
        } else {
          custom.forEach((entry, index) => {
            if (!isRecord(entry)) {
              errors.push(`L’espèce personnalisée #${index + 1} est invalide.`);
              return;
            }
            if (!isNonEmptyString(entry['id']) || !isNonEmptyString(entry['name'])) {
              errors.push(`L’espèce personnalisée #${index + 1} doit avoir un id et un nom.`);
            }
            if (!isFiniteNumber(entry['amount']) || entry['amount'] < 0) {
              errors.push(`Le montant de l’espèce personnalisée #${index + 1} doit être >= 0.`);
            }
            if (
              entry['gpEquivalent'] !== undefined &&
              (!isFiniteNumber(entry['gpEquivalent']) || entry['gpEquivalent'] < 0)
            ) {
              errors.push(
                `La valeur en po de l’espèce personnalisée #${index + 1} doit être >= 0.`,
              );
            }
          });
        }
      }
    }
  }

  const noteEntries = payload['noteEntries'];
  if (noteEntries !== undefined) {
    if (!Array.isArray(noteEntries)) {
      errors.push('Les notes catégorisées (noteEntries) doivent être un tableau.');
    } else {
      noteEntries.forEach((entry, index) => {
        if (!isRecord(entry)) {
          errors.push(`L’entrée de note #${index + 1} est invalide.`);
          return;
        }
        if (!isNonEmptyString(entry['id']) || typeof entry['title'] !== 'string') {
          errors.push(`L’entrée de note #${index + 1} doit avoir un id et un titre.`);
        }
        if (
          typeof entry['category'] !== 'string' ||
          !NOTE_CATEGORIES.includes(entry['category'] as NoteCategory)
        ) {
          errors.push(`Catégorie invalide pour l’entrée de note #${index + 1}.`);
        }
        if (typeof entry['content'] !== 'string' || typeof entry['createdAt'] !== 'string') {
          errors.push(`Contenu ou date invalide pour l’entrée de note #${index + 1}.`);
        }
      });
    }
  }

  const features = payload['features'];
  if (features !== undefined) {
    if (!Array.isArray(features)) {
      errors.push('Les aptitudes et traits (features) doivent être un tableau.');
    } else {
      features.forEach((entry, index) => {
        if (!isRecord(entry)) {
          errors.push(`L’aptitude #${index + 1} est invalide.`);
          return;
        }
        if (!isNonEmptyString(entry['id']) || !isNonEmptyString(entry['name'])) {
          errors.push(`L’aptitude #${index + 1} doit avoir un id et un nom.`);
        }
        if (
          typeof entry['category'] !== 'string' ||
          !FEATURE_CATEGORIES.includes(entry['category'] as FeatureCategory)
        ) {
          errors.push(`Catégorie invalide pour l’aptitude #${index + 1}.`);
        }
        if (entry['source'] !== undefined && typeof entry['source'] !== 'string') {
          errors.push(`Source invalide pour l’aptitude #${index + 1}.`);
        }
        if (typeof entry['description'] !== 'string') {
          errors.push(`Description invalide pour l’aptitude #${index + 1}.`);
        }
      });
    }
  }

  const defenses = payload['defenses'];
  if (defenses !== undefined) {
    if (!isRecord(defenses)) {
      errors.push('Le bloc de défenses et sens (defenses) est invalide.');
    } else {
      const defenseListKeys = [
        'senses',
        'resistances',
        'damageImmunities',
        'conditionImmunities',
        'vulnerabilities',
      ] as const;
      for (const key of defenseListKeys) {
        const list = defenses[key];
        if (
          !Array.isArray(list) ||
          !list.every((item) => typeof item === 'string')
        ) {
          errors.push(`La liste défensive "${key}" doit être un tableau de chaînes.`);
        }
      }
      if (defenses['notes'] !== undefined && typeof defenses['notes'] !== 'string') {
        errors.push('Les notes défensives (defenses.notes) doivent être une chaîne.');
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: payload as unknown as CharacterSheetV1,
  };
}
