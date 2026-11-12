/**
 * Service de sauvegarde externe (Export / Import de fichiers JSON versionnés)
 * et création de Snapshots nommés.
 */

import { validateCharacterSheet } from '../engine';
import type { CharacterSheetV1, CharacterSnapshot } from '../engine';

export interface CharacterBackupEnvelopeV1 {
  backupFormat: 'grimoire-5e-character-backup';
  backupVersion: 1;
  exportedAt: string;
  character: CharacterSheetV1;
}

/**
 * Crée un objet CharacterSnapshot immuable prêt à être stocké dans le CharacterRepository.
 */
export function createSnapshotRecord(
  sheet: CharacterSheetV1,
  label: string,
  nowIso = new Date().toISOString(),
): CharacterSnapshot {
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return {
    snapshotId: `snap-${sheet.id}-${Date.now()}-${randomSuffix}`,
    characterId: sheet.id,
    createdAt: nowIso,
    label: label.trim() || 'Snapshot manuel',
    payload: structuredClone(sheet),
  };
}

/**
 * Sérialise une fiche de personnage en chaîne JSON indentée avec enveloppe de métadonnées.
 */
export function serializeCharacterBackup(
  sheet: CharacterSheetV1,
  exportedAt = new Date().toISOString(),
): string {
  const envelope: CharacterBackupEnvelopeV1 = {
    backupFormat: 'grimoire-5e-character-backup',
    backupVersion: 1,
    exportedAt,
    character: sheet,
  };
  return JSON.stringify(envelope, null, 2);
}

/**
 * Génère un nom de fichier propre et déterministe pour l'export JSON.
 */
export function buildBackupFilename(sheet: CharacterSheetV1): string {
  const safeName = sheet.identity.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const datePart = sheet.updatedAt.slice(0, 10);
  return `grimoire5e-${safeName || 'personnage'}-rev${sheet.revision}-${datePart}.json`;
}

export type ParseBackupResult =
  | { valid: true; character: CharacterSheetV1 }
  | { valid: false; errors: string[] };

/**
 * Analyse et valide strictement le contenu texte d'un fichier JSON importé.
 * Accepte soit l'enveloppe CharacterBackupEnvelopeV1, soit un objet CharacterSheetV1 direct.
 */
export function parseAndValidateBackupJson(rawJson: string): ParseBackupResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      valid: false,
      errors: ['Le fichier sélectionné n’est pas un JSON syntaxiquement valide.'],
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      valid: false,
      errors: ['Le contenu JSON doit être un objet racine.'],
    };
  }

  const record = parsed as Record<string, unknown>;
  const candidate =
    record['backupFormat'] === 'grimoire-5e-character-backup' &&
    record['character'] !== undefined
      ? record['character']
      : parsed;

  const validation = validateCharacterSheet(candidate);
  if (!validation.valid) {
    return {
      valid: false,
      errors: validation.errors,
    };
  }

  return {
    valid: true,
    character: validation.data,
  };
}
