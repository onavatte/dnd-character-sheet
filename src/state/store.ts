/**
 * Store Zustand + Immer (Copy-on-Write en RAM, Pile Undo/Redo, Write-Behind vers IndexedDB
 * et gestion des Snapshots automatiques/manuels).
 */

import { produce } from 'immer';
import type { Draft } from 'immer';
import { createStore, useStore } from 'zustand';
import {
  applyDamage,
  applyHealing,
  applyLongRest,
  applyShortRest,
  createDemoCharacter,
  setTemporaryHp,
  updateResourceCurrent,
} from '../engine';
import type {
  CharacterSheetV1,
  CharacterSnapshot,
  ShortRestOptions,
} from '../engine';
import {
  createSnapshotRecord,
  parseAndValidateBackupJson,
  serializeCharacterBackup,
} from './backup-service';
import type { HistoryStack } from './history';
import {
  createHistoryStack,
  pushHistoryState,
  redoHistoryState,
  undoHistoryState,
} from './history';
import { createDefaultRepository } from './indexeddb-adapter';
import type { CharacterRepository } from './repository';

export type SaveSyncStatus = 'idle' | 'pending' | 'saved' | 'error';

export interface CharacterStoreState {
  history: HistoryStack<CharacterSheetV1>;
  snapshots: CharacterSnapshot[];
  isInitialized: boolean;
  syncStatus: SaveSyncStatus;
  lastError: string | null;

  initialize(): Promise<void>;
  flushPendingWrite(): Promise<void>;

  /* Actions métier immuables avec empilement Undo/Redo */
  applySheetUpdate(updater: (current: CharacterSheetV1) => CharacterSheetV1): void;
  mutateWithImmer(recipe: (draft: Draft<CharacterSheetV1>) => void): void;

  damage(amount: number): void;
  heal(amount: number): void;
  tempHp(amount: number, overwrite?: boolean): void;
  adjustResource(resourceId: string, delta: number): void;
  shortRest(options?: ShortRestOptions): void;
  longRestWithAutoSnapshot(): Promise<void>;

  /* Pile Undo / Redo */
  undo(): void;
  redo(): void;

  /* Gestion des Snapshots locaux (Tier 1) */
  createManualSnapshot(label: string): Promise<CharacterSnapshot>;
  restoreSnapshot(snapshotId: string): Promise<void>;
  deleteSnapshot(snapshotId: string): Promise<void>;

  /* Export / Import JSON (Tier 2) */
  exportCurrentSheetJson(): string;
  importSheetJson(rawJson: string): Promise<{ ok: boolean; errors?: string[] }>;
  resetToDemo(): Promise<void>;
}

export interface CreateCharacterStoreOptions {
  repository?: CharacterRepository;
  writeBehindMs?: number;
  initialSheet?: CharacterSheetV1;
}

export function createCharacterStore(options: CreateCharacterStoreOptions = {}) {
  const repository = options.repository ?? createDefaultRepository();
  const writeBehindMs = options.writeBehindMs ?? 250;
  const fallbackSheet = options.initialSheet ?? createDemoCharacter();

  let writeTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingSheetToPersist: CharacterSheetV1 | null = null;

  const persistImmediately = async (
    sheet: CharacterSheetV1,
    setState: (partial: Partial<CharacterStoreState>) => void,
  ): Promise<void> => {
    try {
      await repository.saveCharacter(sheet);
      setState({ syncStatus: 'saved', lastError: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur d’écriture dans le stockage local.';
      setState({ syncStatus: 'error', lastError: message });
    }
  };

  const scheduleWriteBehind = (
    sheet: CharacterSheetV1,
    setState: (partial: Partial<CharacterStoreState>) => void,
  ): void => {
    pendingSheetToPersist = sheet;
    setState({ syncStatus: 'pending', lastError: null });

    if (writeTimer !== null) {
      clearTimeout(writeTimer);
    }

    if (writeBehindMs <= 0) {
      const target = pendingSheetToPersist;
      pendingSheetToPersist = null;
      void persistImmediately(target, setState);
      return;
    }

    writeTimer = setTimeout(() => {
      writeTimer = null;
      const target = pendingSheetToPersist;
      pendingSheetToPersist = null;
      if (target !== null) {
        void persistImmediately(target, setState);
      }
    }, writeBehindMs);
  };

  return createStore<CharacterStoreState>()((set, get) => ({
    history: createHistoryStack<CharacterSheetV1>(fallbackSheet),
    snapshots: [],
    isInitialized: false,
    syncStatus: 'idle',
    lastError: null,

    async initialize(): Promise<void> {
      try {
        const storedList = await repository.listCharacters();
        const firstStored = storedList[0];

        if (firstStored !== undefined) {
          const snaps = await repository.listSnapshots(firstStored.id);
          set({
            history: createHistoryStack(firstStored),
            snapshots: snaps,
            isInitialized: true,
            syncStatus: 'saved',
            lastError: null,
          });
          return;
        }

        await repository.saveCharacter(fallbackSheet);
        const snaps = await repository.listSnapshots(fallbackSheet.id);
        set({
          history: createHistoryStack(fallbackSheet),
          snapshots: snaps,
          isInitialized: true,
          syncStatus: 'saved',
          lastError: null,
        });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Impossible de charger les données locales.';
        set({
          isInitialized: true,
          syncStatus: 'error',
          lastError: message,
        });
      }
    },

    async flushPendingWrite(): Promise<void> {
      if (writeTimer !== null) {
        clearTimeout(writeTimer);
        writeTimer = null;
      }
      if (pendingSheetToPersist !== null) {
        const target = pendingSheetToPersist;
        pendingSheetToPersist = null;
        await persistImmediately(target, set);
      }
    },

    applySheetUpdate(updater): void {
      const currentHistory = get().history;
      const nextSheet = updater(currentHistory.present);
      if (Object.is(nextSheet, currentHistory.present)) {
        return;
      }
      const nextHistory = pushHistoryState(currentHistory, nextSheet);
      set({ history: nextHistory });
      scheduleWriteBehind(nextSheet, set);
    },

    mutateWithImmer(recipe): void {
      get().applySheetUpdate((current) =>
        produce(current, (draft) => {
          recipe(draft);
          draft.revision += 1;
          draft.updatedAt = new Date().toISOString();
        }),
      );
    },

    damage(amount): void {
      get().applySheetUpdate((sheet) => applyDamage(sheet, amount));
    },

    heal(amount): void {
      get().applySheetUpdate((sheet) => applyHealing(sheet, amount));
    },

    tempHp(amount, overwrite = false): void {
      get().applySheetUpdate((sheet) => setTemporaryHp(sheet, amount, overwrite));
    },

    adjustResource(resourceId, delta): void {
      get().applySheetUpdate((sheet) =>
        updateResourceCurrent(sheet, resourceId, delta),
      );
    },

    shortRest(restOptions): void {
      get().applySheetUpdate((sheet) => applyShortRest(sheet, restOptions));
    },

    async longRestWithAutoSnapshot(): Promise<void> {
      const currentSheet = get().history.present;
      const autoSnap = createSnapshotRecord(
        currentSheet,
        `Auto — Avant Repos Long (Rév. #${currentSheet.revision})`,
      );
      await repository.saveSnapshot(autoSnap);
      const updatedSnapshots = await repository.listSnapshots(currentSheet.id);
      set({ snapshots: updatedSnapshots });

      get().applySheetUpdate((sheet) => applyLongRest(sheet));
      await get().flushPendingWrite();
    },

    undo(): void {
      const currentHistory = get().history;
      if (currentHistory.past.length === 0) return;
      const nextHistory = undoHistoryState(currentHistory);
      set({ history: nextHistory });
      scheduleWriteBehind(nextHistory.present, set);
    },

    redo(): void {
      const currentHistory = get().history;
      if (currentHistory.future.length === 0) return;
      const nextHistory = redoHistoryState(currentHistory);
      set({ history: nextHistory });
      scheduleWriteBehind(nextHistory.present, set);
    },

    async createManualSnapshot(label: string): Promise<CharacterSnapshot> {
      const currentSheet = get().history.present;
      const snap = createSnapshotRecord(currentSheet, label);
      await repository.saveSnapshot(snap);
      const updatedSnapshots = await repository.listSnapshots(currentSheet.id);
      set({ snapshots: updatedSnapshots });
      return snap;
    },

    async restoreSnapshot(snapshotId: string): Promise<void> {
      const target = get().snapshots.find((s) => s.snapshotId === snapshotId);
      if (target === undefined) {
        return;
      }
      const restoredSheet: CharacterSheetV1 = {
        ...structuredClone(target.payload),
        revision: get().history.present.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      const nextHistory = pushHistoryState(get().history, restoredSheet);
      set({ history: nextHistory });
      await persistImmediately(restoredSheet, set);
    },

    async deleteSnapshot(snapshotId: string): Promise<void> {
      const currentSheetId = get().history.present.id;
      await repository.deleteSnapshot(snapshotId);
      const updatedSnapshots = await repository.listSnapshots(currentSheetId);
      set({ snapshots: updatedSnapshots });
    },

    exportCurrentSheetJson(): string {
      return serializeCharacterBackup(get().history.present);
    },

    async importSheetJson(
      rawJson: string,
    ): Promise<{ ok: boolean; errors?: string[] }> {
      const parsed = parseAndValidateBackupJson(rawJson);
      if (!parsed.valid) {
        set({ lastError: parsed.errors.join(' ') });
        return { ok: false, errors: parsed.errors };
      }

      const currentSheet = get().history.present;
      const safetySnap = createSnapshotRecord(
        currentSheet,
        `Auto — Avant Import JSON (Rév. #${currentSheet.revision})`,
      );
      await repository.saveSnapshot(safetySnap);

      await persistImmediately(parsed.character, set);
      const snaps = await repository.listSnapshots(parsed.character.id);
      const nextHistory = pushHistoryState(get().history, parsed.character);
      set({
        history: nextHistory,
        snapshots: snaps,
        lastError: null,
      });

      return { ok: true };
    },

    async resetToDemo(): Promise<void> {
      const freshDemo = createDemoCharacter(new Date().toISOString());
      const nextHistory = pushHistoryState(get().history, freshDemo);
      set({ history: nextHistory });
      await persistImmediately(freshDemo, set);
      const snaps = await repository.listSnapshots(freshDemo.id);
      set({ snapshots: snaps });
    },
  }));
}

export const defaultCharacterStore = createCharacterStore();

export function useCharacterStore<T>(
  selector: (state: CharacterStoreState) => T,
): T {
  return useStore(defaultCharacterStore, selector);
}
