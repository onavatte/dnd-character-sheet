import { describe, expect, it } from 'vitest';
import { createDemoCharacter } from '../engine';
import {
  buildBackupFilename,
  createHistoryStack,
  createCharacterStore,
  InMemoryCharacterRepository,
  parseAndValidateBackupJson,
  pushHistoryState,
  redoHistoryState,
  serializeCharacterBackup,
  undoHistoryState,
} from './index';

describe('history — Pile Undo / Redo Copy-on-Write', () => {
  it('empile les états, annule (undo), rétablit (redo) et purge le futur sur nouvelle branche', () => {
    const s0 = createHistoryStack(10, 3);
    const s1 = pushHistoryState(s0, 20);
    const s2 = pushHistoryState(s1, 30);

    expect(s2.present).toBe(30);
    expect(s2.past).toEqual([10, 20]);
    expect(s2.future).toEqual([]);

    const undone1 = undoHistoryState(s2);
    expect(undone1.present).toBe(20);
    expect(undone1.past).toEqual([10]);
    expect(undone1.future).toEqual([30]);

    const redone1 = redoHistoryState(undone1);
    expect(redone1.present).toBe(30);
    expect(redone1.past).toEqual([10, 20]);
    expect(redone1.future).toEqual([]);

    // Nouvelle modification après un undo : la branche future doit être purgée
    const branched = pushHistoryState(undone1, 25);
    expect(branched.present).toBe(25);
    expect(branched.past).toEqual([10, 20]);
    expect(branched.future).toEqual([]);
  });

  it('respecte la profondeur maximale (maxDepth)', () => {
    let stack = createHistoryStack('A', 2);
    stack = pushHistoryState(stack, 'B');
    stack = pushHistoryState(stack, 'C');
    stack = pushHistoryState(stack, 'D');

    expect(stack.present).toBe('D');
    expect(stack.past).toEqual(['B', 'C']);
  });
});

describe('backup-service — Sérialisation & Validation JSON (Tier 2)', () => {
  it('sérialise une enveloppe JSON v1 et la réimporte sans perte', () => {
    const demo = createDemoCharacter('2026-03-30T12:00:00.000Z');
    const rawJson = serializeCharacterBackup(demo, '2026-03-30T12:05:00.000Z');
    const filename = buildBackupFilename(demo);

    expect(filename).toBe('grimoire5e-kaelen-vance-rev1-2026-03-30.json');

    const result = parseAndValidateBackupJson(rawJson);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.character.identity.name).toBe('Kaelen Vance');
      expect(result.character.revision).toBe(1);
    }
  });

  it('rejette un JSON syntaxiquement malformé ou au schéma invalide', () => {
    const malformed = parseAndValidateBackupJson('{ invalid json ');
    expect(malformed.valid).toBe(false);

    const badSchema = parseAndValidateBackupJson(
      JSON.stringify({ format: 'grimoire-5e-backup', backupVersion: 1, character: { schemaVersion: 99 } }),
    );
    expect(badSchema.valid).toBe(false);
  });
});

describe('store — Intégration Zustand + Immer + Repository + Snapshots', () => {
  it('initialise le personnage, applique des mutations avec Undo/Redo et persiste en Write-Behind', async () => {
    const repo = new InMemoryCharacterRepository();
    const store = createCharacterStore({ repository: repo, writeBehindMs: 0 });

    await store.getState().initialize();
    expect(store.getState().isInitialized).toBe(true);
    expect(store.getState().history.present.combat.hpCurrent).toBe(52);

    // Dégâts de 6 PV (4 absorbés par PV temp, 2 sur PV réels -> 50 PV)
    store.getState().damage(6);
    expect(store.getState().history.present.combat.hpCurrent).toBe(50);
    expect(store.getState().history.past.length).toBe(1);

    // Mutation Immer directe (changement de nom en Mode Forge)
    store.getState().mutateWithImmer((draft) => {
      draft.identity.name = 'Kaelen Vance Mk.II';
    });
    expect(store.getState().history.present.identity.name).toBe('Kaelen Vance Mk.II');
    expect(store.getState().history.past.length).toBe(2);

    // Undo -> revient à Kaelen Vance avec 50 PV
    store.getState().undo();
    expect(store.getState().history.present.identity.name).toBe('Kaelen Vance');
    expect(store.getState().history.present.combat.hpCurrent).toBe(50);
    expect(store.getState().history.future.length).toBe(1);

    // Redo -> revient à Kaelen Vance Mk.II
    store.getState().redo();
    expect(store.getState().history.present.identity.name).toBe('Kaelen Vance Mk.II');

    // Vérification de la persistance dans le repository
    const currentId = store.getState().history.present.id;
    const persisted = await repo.getCharacter(currentId);
    expect(persisted?.identity.name).toBe('Kaelen Vance Mk.II');
  });

  it('crée automatiquement un snapshot avant un Repos Long et permet de le restaurer', async () => {
    const repo = new InMemoryCharacterRepository();
    const store = createCharacterStore({ repository: repo, writeBehindMs: 0 });
    await store.getState().initialize();

    store.getState().damage(15); // 4 temp absorbés, 11 réels -> 41 PV
    expect(store.getState().history.present.combat.hpCurrent).toBe(41);

    await store.getState().longRestWithAutoSnapshot();

    // Après Repos Long : PV reviennent au max (58) et un snapshot auto a été créé
    expect(store.getState().history.present.combat.hpCurrent).toBe(58);
    expect(store.getState().snapshots.length).toBe(1);
    const snap = store.getState().snapshots[0];
    expect(snap?.label).toContain('Auto — Avant Repos Long');
    expect(snap?.payload.combat.hpCurrent).toBe(41);

    // Restauration du snapshot : on retrouve les 41 PV d'avant le Repos Long
    if (snap) {
      await store.getState().restoreSnapshot(snap.snapshotId);
    }
    expect(store.getState().history.present.combat.hpCurrent).toBe(41);
  });

  it('exporte et réimporte une sauvegarde JSON en créant un snapshot de sécurité', async () => {
    const repo = new InMemoryCharacterRepository();
    const store = createCharacterStore({ repository: repo, writeBehindMs: 0 });
    await store.getState().initialize();

    store.getState().mutateWithImmer((draft) => {
      draft.identity.background = 'Éclaireur du Bunker 7';
    });

    const exportedJson = store.getState().exportCurrentSheetJson();

    // On blesse le personnage après l'export (20 dégâts : 4 temp absorbés, 16 réels -> 36 PV)
    store.getState().damage(20);
    expect(store.getState().history.present.combat.hpCurrent).toBe(36);

    // On réimporte la sauvegarde exportée
    const importOutcome = await store.getState().importSheetJson(exportedJson);
    expect(importOutcome.ok).toBe(true);
    expect(store.getState().history.present.combat.hpCurrent).toBe(52);
    expect(store.getState().snapshots.some((s) => s.label.includes('Auto — Avant Import JSON'))).toBe(true);
  });
});
