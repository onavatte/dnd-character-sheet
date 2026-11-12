/**
 * Adaptateur IndexedDB natif (Tier 1 — Stockage Transactionnel Navigateur).
 * Implémente CharacterRepository avec deux Object Stores :
 * - 'characters' (keyPath: 'id')
 * - 'snapshots' (keyPath: 'snapshotId', index: 'by_characterId')
 */

import { validateCharacterSheet } from '../engine';
import type { CharacterSheetV1, CharacterSnapshot } from '../engine';
import type { CharacterRepository } from './repository';
import { InMemoryCharacterRepository } from './repository';

const DB_NAME = 'grimoire-5e-db';
const DB_VERSION = 1;
const STORE_CHARACTERS = 'characters';
const STORE_SNAPSHOTS = 'snapshots';
const INDEX_SNAPSHOT_CHARACTER = 'by_characterId';

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Erreur lors de la requête IndexedDB'));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error('Erreur lors de la transaction IndexedDB'));
    tx.onabort = () =>
      reject(tx.error ?? new Error('Transaction IndexedDB annulée'));
  });
}

export class IndexedDBCharacterRepository implements CharacterRepository {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise !== null) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB n’est pas disponible dans cet environnement.'));
        return;
      }

      const openReq = indexedDB.open(DB_NAME, DB_VERSION);

      openReq.onupgradeneeded = () => {
        const db = openReq.result;
        if (!db.objectStoreNames.contains(STORE_CHARACTERS)) {
          db.createObjectStore(STORE_CHARACTERS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          const snapStore = db.createObjectStore(STORE_SNAPSHOTS, {
            keyPath: 'snapshotId',
          });
          snapStore.createIndex(INDEX_SNAPSHOT_CHARACTER, 'characterId', {
            unique: false,
          });
        }
      };

      openReq.onsuccess = () => resolve(openReq.result);
      openReq.onerror = () =>
        reject(openReq.error ?? new Error('Impossible d’ouvrir la base IndexedDB'));
    });

    return this.dbPromise;
  }

  async listCharacters(): Promise<CharacterSheetV1[]> {
    const db = await this.openDatabase();
    const tx = db.transaction(STORE_CHARACTERS, 'readonly');
    const store = tx.objectStore(STORE_CHARACTERS);
    const rawList = await requestToPromise<unknown[]>(store.getAll());

    const validSheets: CharacterSheetV1[] = [];
    for (const item of rawList) {
      const check = validateCharacterSheet(item);
      if (check.valid) {
        validSheets.push(check.data);
      }
    }

    return validSheets.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getCharacter(id: string): Promise<CharacterSheetV1 | null> {
    const db = await this.openDatabase();
    const tx = db.transaction(STORE_CHARACTERS, 'readonly');
    const store = tx.objectStore(STORE_CHARACTERS);
    const raw = await requestToPromise<unknown>(store.get(id));
    if (raw === undefined || raw === null) {
      return null;
    }
    const check = validateCharacterSheet(raw);
    return check.valid ? check.data : null;
  }

  async saveCharacter(sheet: CharacterSheetV1): Promise<void> {
    const check = validateCharacterSheet(sheet);
    if (!check.valid) {
      throw new Error(
        `Impossible de sauvegarder une fiche invalide : ${check.errors.join(' ')}`,
      );
    }
    const db = await this.openDatabase();
    const tx = db.transaction(STORE_CHARACTERS, 'readwrite');
    tx.objectStore(STORE_CHARACTERS).put(check.data);
    await transactionDone(tx);
  }

  async deleteCharacter(id: string): Promise<void> {
    const db = await this.openDatabase();
    const snapshots = await this.listSnapshots(id);
    const tx = db.transaction([STORE_CHARACTERS, STORE_SNAPSHOTS], 'readwrite');
    tx.objectStore(STORE_CHARACTERS).delete(id);
    const snapStore = tx.objectStore(STORE_SNAPSHOTS);
    for (const snap of snapshots) {
      snapStore.delete(snap.snapshotId);
    }
    await transactionDone(tx);
  }

  async listSnapshots(characterId: string): Promise<CharacterSnapshot[]> {
    const db = await this.openDatabase();
    const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
    const index = tx.objectStore(STORE_SNAPSHOTS).index(INDEX_SNAPSHOT_CHARACTER);
    const rawList = await requestToPromise<CharacterSnapshot[]>(
      index.getAll(characterId),
    );
    return rawList.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async saveSnapshot(snapshot: CharacterSnapshot): Promise<void> {
    const check = validateCharacterSheet(snapshot.payload);
    if (!check.valid) {
      throw new Error(
        `Snapshot invalide : ${check.errors.join(' ')}`,
      );
    }
    const db = await this.openDatabase();
    const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
    tx.objectStore(STORE_SNAPSHOTS).put(snapshot);
    await transactionDone(tx);
  }

  async deleteSnapshot(snapshotId: string): Promise<void> {
    const db = await this.openDatabase();
    const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
    tx.objectStore(STORE_SNAPSHOTS).delete(snapshotId);
    await transactionDone(tx);
  }
}

/**
 * Fabrique le repository par défaut selon les capacités de l'environnement (IndexedDB ou mémoire).
 */
export function createDefaultRepository(): CharacterRepository {
  if (typeof indexedDB !== 'undefined') {
    return new IndexedDBCharacterRepository();
  }
  return new InMemoryCharacterRepository();
}
