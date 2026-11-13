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
  createBlankCharacter,
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

const ACTIVE_CHAR_STORAGE_KEY = 'grimoire-active-character-id';
const ROSTER_CLEARED_STORAGE_KEY = 'grimoire-roster-cleared';

function readLocalStorageValue(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorageValue(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage restrictions
  }
}

export interface CharacterStoreState {
  history: HistoryStack<CharacterSheetV1>;
  characters: CharacterSheetV1[];
  hasActiveCharacter: boolean;
  snapshots: CharacterSnapshot[];
  isInitialized: boolean;
  syncStatus: SaveSyncStatus;
  lastError: string | null;

  initialize(): Promise<void>;
  flushPendingWrite(): Promise<void>;

  /* Gestion multi-personnages (Jalon 4) */
  switchCharacter(characterId: string): Promise<void>;
  createNewCharacter(name?: string): Promise<CharacterSheetV1>;
  duplicateCurrentCharacter(customName?: string): Promise<CharacterSheetV1 | null>;
  loadDemoCharacter(): Promise<CharacterSheetV1>;
  deleteCharacter(characterId: string): Promise<void>;

  /* Actions métier immuables avec empilement Undo/Redo */
  applySheetUpdate(updater: (current: CharacterSheetV1) => CharacterSheetV1): void;
  mutateWithImmer(recipe: (draft: Draft<CharacterSheetV1>) => void): void;

  damage(amount: number): void;
  heal(amount: number): void;
  tempHp(amount: number, overwrite?: boolean): void;
  adjustResource(resourceId: string, delta: number): void;
  toggleCondition(conditionId: string): void;
  setExhaustionLevel(level: 0 | 1 | 2 | 3 | 4 | 5 | 6): void;
  setDeathSaves(successes: number, failures: number): void;
  adjustSpellSlotUsed(level: number, delta: number): void;
  adjustPactSlotUsed(delta: number): void;
  updateNotes(nextNotes: string): void;
  appendQuickNote(entryText: string): void;
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
      const list = await repository.listCharacters();
      setState({ characters: list, syncStatus: 'saved', lastError: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur d’écriture dans le stockage local.';
      setState({ syncStatus: 'error', lastError: message });
    }
  };

  const cancelPendingWriteFor = (characterId: string): void => {
    if (pendingSheetToPersist?.id === characterId) {
      if (writeTimer !== null) {
        clearTimeout(writeTimer);
        writeTimer = null;
      }
      pendingSheetToPersist = null;
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
    characters: [],
    hasActiveCharacter: true,
    snapshots: [],
    isInitialized: false,
    syncStatus: 'idle',
    lastError: null,

    async initialize(): Promise<void> {
      try {
        const storedList = await repository.listCharacters();
        if (storedList.length > 0) {
          const preferredId = readLocalStorageValue(ACTIVE_CHAR_STORAGE_KEY);
          const selected =
            (preferredId
              ? storedList.find((c) => c.id === preferredId)
              : undefined) ?? storedList[0];

          if (selected !== undefined) {
            const snaps = await repository.listSnapshots(selected.id);
            writeLocalStorageValue(ACTIVE_CHAR_STORAGE_KEY, selected.id);
            writeLocalStorageValue(ROSTER_CLEARED_STORAGE_KEY, null);
            set({
              history: createHistoryStack(selected),
              characters: storedList,
              hasActiveCharacter: true,
              snapshots: snaps,
              isInitialized: true,
              syncStatus: 'saved',
              lastError: null,
            });
            return;
          }
        }

        if (readLocalStorageValue(ROSTER_CLEARED_STORAGE_KEY) === '1') {
          set({
            characters: [],
            hasActiveCharacter: false,
            snapshots: [],
            isInitialized: true,
            syncStatus: 'saved',
            lastError: null,
          });
          return;
        }

        await repository.saveCharacter(fallbackSheet);
        const list = await repository.listCharacters();
        const snaps = await repository.listSnapshots(fallbackSheet.id);
        writeLocalStorageValue(ACTIVE_CHAR_STORAGE_KEY, fallbackSheet.id);
        set({
          history: createHistoryStack(fallbackSheet),
          characters: list,
          hasActiveCharacter: true,
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

    async switchCharacter(characterId: string): Promise<void> {
      await get().flushPendingWrite();
      const target = await repository.getCharacter(characterId);
      if (target === null) return;
      const snaps = await repository.listSnapshots(characterId);
      const list = await repository.listCharacters();
      writeLocalStorageValue(ACTIVE_CHAR_STORAGE_KEY, target.id);
      writeLocalStorageValue(ROSTER_CLEARED_STORAGE_KEY, null);
      set({
        history: createHistoryStack(target),
        characters: list,
        hasActiveCharacter: true,
        snapshots: snaps,
        syncStatus: 'saved',
        lastError: null,
      });
    },

    async createNewCharacter(name?: string): Promise<CharacterSheetV1> {
      if (get().hasActiveCharacter) {
        await get().flushPendingWrite();
      }
      const blank = createBlankCharacter(
        name !== undefined ? { name } : {},
      );
      writeLocalStorageValue(ACTIVE_CHAR_STORAGE_KEY, blank.id);
      writeLocalStorageValue(ROSTER_CLEARED_STORAGE_KEY, null);
      set({
        history: createHistoryStack(blank),
        hasActiveCharacter: true,
        snapshots: [],
      });
      await persistImmediately(blank, set);
      return blank;
    },

    async duplicateCurrentCharacter(
      customName?: string,
    ): Promise<CharacterSheetV1 | null> {
      if (!get().hasActiveCharacter) return null;
      await get().flushPendingWrite();
      const current = get().history.present;
      const nowIso = new Date().toISOString();
      const suffix = Math.random().toString(36).slice(2, 7);
      const duplicated: CharacterSheetV1 = {
        ...structuredClone(current),
        id: `char-${Date.now()}-${suffix}`,
        revision: 1,
        updatedAt: nowIso,
        identity: {
          ...structuredClone(current.identity),
          name: customName?.trim() || `${current.identity.name} (Copie)`,
        },
      };
      writeLocalStorageValue(ACTIVE_CHAR_STORAGE_KEY, duplicated.id);
      writeLocalStorageValue(ROSTER_CLEARED_STORAGE_KEY, null);
      set({
        history: createHistoryStack(duplicated),
        hasActiveCharacter: true,
        snapshots: [],
      });
      await persistImmediately(duplicated, set);
      return duplicated;
    },

    async loadDemoCharacter(): Promise<CharacterSheetV1> {
      if (get().hasActiveCharacter) {
        await get().flushPendingWrite();
      }
      const nowIso = new Date().toISOString();
      const demoBase = createDemoCharacter(nowIso);
      const existing = await repository.getCharacter(demoBase.id);
      const demo: CharacterSheetV1 =
        existing !== null
          ? {
              ...demoBase,
              id: `demo-kaelen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            }
          : demoBase;

      writeLocalStorageValue(ACTIVE_CHAR_STORAGE_KEY, demo.id);
      writeLocalStorageValue(ROSTER_CLEARED_STORAGE_KEY, null);
      set({
        history: createHistoryStack(demo),
        hasActiveCharacter: true,
        snapshots: [],
      });
      await persistImmediately(demo, set);
      return demo;
    },

    async deleteCharacter(characterId: string): Promise<void> {
      const currentId = get().history.present.id;
      if (currentId === characterId) {
        cancelPendingWriteFor(characterId);
      } else if (get().hasActiveCharacter) {
        await get().flushPendingWrite();
      }

      await repository.deleteCharacter(characterId);
      const remaining = await repository.listCharacters();

      if (remaining.length === 0) {
        writeLocalStorageValue(ACTIVE_CHAR_STORAGE_KEY, null);
        writeLocalStorageValue(ROSTER_CLEARED_STORAGE_KEY, '1');
        set({
          characters: [],
          hasActiveCharacter: false,
          snapshots: [],
          syncStatus: 'saved',
          lastError: null,
        });
        return;
      }

      if (currentId === characterId || !get().hasActiveCharacter) {
        const nextSheet = remaining[0];
        if (nextSheet !== undefined) {
          const snaps = await repository.listSnapshots(nextSheet.id);
          writeLocalStorageValue(ACTIVE_CHAR_STORAGE_KEY, nextSheet.id);
          set({
            history: createHistoryStack(nextSheet),
            characters: remaining,
            hasActiveCharacter: true,
            snapshots: snaps,
            syncStatus: 'saved',
            lastError: null,
          });
        }
        return;
      }

      set({ characters: remaining, syncStatus: 'saved', lastError: null });
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

    toggleCondition(conditionId): void {
      get().mutateWithImmer((draft) => {
        const idx = draft.combat.conditions.indexOf(conditionId);
        if (idx >= 0) {
          draft.combat.conditions.splice(idx, 1);
        } else {
          draft.combat.conditions.push(conditionId);
        }
      });
    },

    setExhaustionLevel(level): void {
      get().mutateWithImmer((draft) => {
        draft.combat.exhaustionLevel = level;
      });
    },

    setDeathSaves(successes, failures): void {
      get().mutateWithImmer((draft) => {
        draft.combat.deathSaves.successes = Math.min(3, Math.max(0, Math.trunc(successes)));
        draft.combat.deathSaves.failures = Math.min(3, Math.max(0, Math.trunc(failures)));
      });
    },

    adjustSpellSlotUsed(level, delta): void {
      get().mutateWithImmer((draft) => {
        const slot = draft.spellcasting?.slots[level];
        if (!slot) return;
        slot.used = Math.min(slot.max, Math.max(0, slot.used + Math.trunc(delta)));
      });
    },

    adjustPactSlotUsed(delta): void {
      get().mutateWithImmer((draft) => {
        const pact = draft.spellcasting?.pactSlots;
        if (!pact) return;
        pact.used = Math.min(pact.max, Math.max(0, pact.used + Math.trunc(delta)));
      });
    },

    updateNotes(nextNotes): void {
      get().mutateWithImmer((draft) => {
        draft.notes = nextNotes;
      });
    },

    appendQuickNote(entryText): void {
      const trimmed = entryText.trim();
      if (trimmed.length === 0) return;
      get().mutateWithImmer((draft) => {
        const prefix = draft.notes.trim().length > 0 ? `${draft.notes.trimEnd()}\n` : '';
        draft.notes = `${prefix}• ${trimmed}`;
      });
    },

    shortRest(restOptions): void {
      get().applySheetUpdate((sheet) => applyShortRest(sheet, restOptions));
    },

    async longRestWithAutoSnapshot(): Promise<void> {
      const currentSheet = get().history.present;
      const autoSnap = createSnapshotRecord(
        currentSheet,
        `Auto - Avant Repos Long (Rév. #${currentSheet.revision})`,
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

      if (get().hasActiveCharacter) {
        const currentSheet = get().history.present;
        const safetySnap = createSnapshotRecord(
          currentSheet,
          `Auto - Avant Import JSON (Rév. #${currentSheet.revision})`,
        );
        await repository.saveSnapshot(safetySnap);
      }

      writeLocalStorageValue(ACTIVE_CHAR_STORAGE_KEY, parsed.character.id);
      writeLocalStorageValue(ROSTER_CLEARED_STORAGE_KEY, null);
      await persistImmediately(parsed.character, set);
      const snaps = await repository.listSnapshots(parsed.character.id);
      const nextHistory = get().hasActiveCharacter
        ? pushHistoryState(get().history, parsed.character)
        : createHistoryStack(parsed.character);
      set({
        history: nextHistory,
        hasActiveCharacter: true,
        snapshots: snaps,
        lastError: null,
      });

      return { ok: true };
    },

    async resetToDemo(): Promise<void> {
      const freshDemo = createDemoCharacter(new Date().toISOString());
      const nextHistory = get().hasActiveCharacter
        ? pushHistoryState(get().history, freshDemo)
        : createHistoryStack(freshDemo);
      writeLocalStorageValue(ACTIVE_CHAR_STORAGE_KEY, freshDemo.id);
      writeLocalStorageValue(ROSTER_CLEARED_STORAGE_KEY, null);
      set({ history: nextHistory, hasActiveCharacter: true });
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
