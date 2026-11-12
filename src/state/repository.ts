/**
 * Contrat abstrait de persistance (CharacterRepository) et implémentation en mémoire
 * pour les tests unitaires déterministes.
 * Prépare l'inversion de dépendance pour IndexedDB (v1) et la synchronisation Homelab (v2).
 */

import type { CharacterSheetV1, CharacterSnapshot } from '../engine';

export interface CharacterRepository {
  listCharacters(): Promise<CharacterSheetV1[]>;
  getCharacter(id: string): Promise<CharacterSheetV1 | null>;
  saveCharacter(sheet: CharacterSheetV1): Promise<void>;
  deleteCharacter(id: string): Promise<void>;

  listSnapshots(characterId: string): Promise<CharacterSnapshot[]>;
  saveSnapshot(snapshot: CharacterSnapshot): Promise<void>;
  deleteSnapshot(snapshotId: string): Promise<void>;
}

/**
 * Implémentation en mémoire vive du CharacterRepository.
 * Utilisée dans les tests unitaires Vitest et comme repli si IndexedDB est indisponible.
 */
export class InMemoryCharacterRepository implements CharacterRepository {
  private readonly characters = new Map<string, CharacterSheetV1>();
  private readonly snapshots = new Map<string, CharacterSnapshot>();

  async listCharacters(): Promise<CharacterSheetV1[]> {
    return Array.from(this.characters.values()).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  async getCharacter(id: string): Promise<CharacterSheetV1 | null> {
    return this.characters.get(id) ?? null;
  }

  async saveCharacter(sheet: CharacterSheetV1): Promise<void> {
    this.characters.set(sheet.id, structuredClone(sheet));
  }

  async deleteCharacter(id: string): Promise<void> {
    this.characters.delete(id);
    for (const [snapId, snap] of this.snapshots.entries()) {
      if (snap.characterId === id) {
        this.snapshots.delete(snapId);
      }
    }
  }

  async listSnapshots(characterId: string): Promise<CharacterSnapshot[]> {
    return Array.from(this.snapshots.values())
      .filter((s) => s.characterId === characterId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async saveSnapshot(snapshot: CharacterSnapshot): Promise<void> {
    this.snapshots.set(snapshot.snapshotId, structuredClone(snapshot));
  }

  async deleteSnapshot(snapshotId: string): Promise<void> {
    this.snapshots.delete(snapshotId);
  }
}
