import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { computeDerivedCharacter } from '../engine';
import type { TermDisplayMode, ThemeMode } from '../engine';
import { buildBackupFilename, useCharacterStore } from '../state';
import { AbilitiesAndSkillsPanel } from './components/AbilitiesAndSkillsPanel';
import { CharacterSelectorDialog } from './components/CharacterSelectorDialog';
import { CombatAndResourcesPanel } from './components/CombatAndResourcesPanel';
import { DiceAssistantPanel } from './components/DiceAssistantPanel';
import type { RollLogEntry } from './components/DiceAssistantPanel';
import { RestDialogs } from './components/RestDialogs';
import { SystemSettingsDialog } from './components/SystemSettingsDialog';
import { VitalityBanner } from './components/VitalityBanner';
import type { ActiveRollTarget, DiceRollMode } from './components/dialog-utils';

type SheetMode = 'cockpit' | 'forge';

function getInitialTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function getInitialDiceRollMode(): DiceRollMode {
  if (typeof window === 'undefined') return 'physical';
  try {
    return window.localStorage.getItem('dice-roll-mode') === 'virtual'
      ? 'virtual'
      : 'physical';
  } catch {
    return 'physical';
  }
}

export function App() {
  const history = useCharacterStore((s) => s.history);
  const characters = useCharacterStore((s) => s.characters);
  const hasActiveCharacter = useCharacterStore((s) => s.hasActiveCharacter);
  const isInitialized = useCharacterStore((s) => s.isInitialized);
  const snapshots = useCharacterStore((s) => s.snapshots);
  const syncStatus = useCharacterStore((s) => s.syncStatus);
  const lastError = useCharacterStore((s) => s.lastError);

  const initialize = useCharacterStore((s) => s.initialize);
  const switchCharacter = useCharacterStore((s) => s.switchCharacter);
  const createNewCharacter = useCharacterStore((s) => s.createNewCharacter);
  const duplicateCurrentCharacter = useCharacterStore(
    (s) => s.duplicateCurrentCharacter,
  );
  const loadDemoCharacter = useCharacterStore((s) => s.loadDemoCharacter);
  const deleteCharacter = useCharacterStore((s) => s.deleteCharacter);
  const damage = useCharacterStore((s) => s.damage);
  const heal = useCharacterStore((s) => s.heal);
  const tempHp = useCharacterStore((s) => s.tempHp);
  const adjustResource = useCharacterStore((s) => s.adjustResource);
  const toggleCondition = useCharacterStore((s) => s.toggleCondition);
  const setExhaustionLevel = useCharacterStore((s) => s.setExhaustionLevel);
  const setDeathSaves = useCharacterStore((s) => s.setDeathSaves);
  const adjustSpellSlotUsed = useCharacterStore((s) => s.adjustSpellSlotUsed);
  const adjustPactSlotUsed = useCharacterStore((s) => s.adjustPactSlotUsed);
  const updateNotes = useCharacterStore((s) => s.updateNotes);
  const appendQuickNote = useCharacterStore((s) => s.appendQuickNote);
  const shortRest = useCharacterStore((s) => s.shortRest);
  const longRestWithAutoSnapshot = useCharacterStore(
    (s) => s.longRestWithAutoSnapshot,
  );
  const undo = useCharacterStore((s) => s.undo);
  const redo = useCharacterStore((s) => s.redo);
  const createManualSnapshot = useCharacterStore((s) => s.createManualSnapshot);
  const restoreSnapshot = useCharacterStore((s) => s.restoreSnapshot);
  const deleteSnapshot = useCharacterStore((s) => s.deleteSnapshot);
  const exportCurrentSheetJson = useCharacterStore(
    (s) => s.exportCurrentSheetJson,
  );
  const importSheetJson = useCharacterStore((s) => s.importSheetJson);
  const resetToDemo = useCharacterStore((s) => s.resetToDemo);

  const sheet = history.present;
  const undoCount = history.past.length;
  const redoCount = history.future.length;

  const [sheetMode, setSheetMode] = useState<SheetMode>('cockpit');
  const [termMode, setTermMode] = useState<TermDisplayMode>('bilingual');
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [diceRollMode, setDiceRollMode] = useState<DiceRollMode>(
    getInitialDiceRollMode,
  );

  const shortRestDialogRef = useRef<HTMLDialogElement>(null);
  const longRestDialogRef = useRef<HTMLDialogElement>(null);
  const settingsDialogRef = useRef<HTMLDialogElement>(null);
  const characterDialogRef = useRef<HTMLDialogElement>(null);
  const emptyImportInputRef = useRef<HTMLInputElement>(null);

  const derived = computeDerivedCharacter(sheet);

  const defaultSkill =
    derived.skills.find((s) => s.id === 'stealth') ?? derived.skills[0];

  const [selectedRollTarget, setSelectedRollTarget] =
    useState<ActiveRollTarget | null>(null);
  const [isDiceModalOpen, setIsDiceModalOpen] = useState<boolean>(false);
  const [rollLog, setRollLog] = useState<RollLogEntry[]>([]);
  const [backupFeedback, setBackupFeedback] = useState<string | null>(null);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="color-scheme"]',
    );
    if (meta) {
      meta.content = theme;
    }
    try {
      localStorage.setItem('color-scheme', theme);
    } catch {
      // Ignore storage restrictions
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('dice-roll-mode', diceRollMode);
    } catch {
      // Ignore storage restrictions
    }
  }, [diceRollMode]);

  const activeRollTarget: ActiveRollTarget = selectedRollTarget ?? {
    id: defaultSkill?.id ?? 'stealth',
    label: defaultSkill?.name ?? 'Discrétion',
    ...(defaultSkill?.originalName !== undefined
      ? { originalLabel: defaultSkill.originalName }
      : {}),
    category: 'skill',
    modifier: defaultSkill?.modifier ?? 0,
    initialMode: 'd20',
  };

  const handleSelectRollTarget = (target: ActiveRollTarget) => {
    setSelectedRollTarget(target);
    setIsDiceModalOpen(true);
  };

  const renderTerm = (fr: string, en?: string) => {
    if (!en || termMode === 'fr') return <span>{fr}</span>;
    if (termMode === 'en') return <span lang="en">{en}</span>;
    return (
      <span>
        {fr}{' '}
        <span className="original-term" lang="en">
          ({en})
        </span>
      </span>
    );
  };

  const pushRollLog = (entry: RollLogEntry) => {
    setRollLog((prev) => [entry, ...prev].slice(0, 12));
  };

  const handleCreateManualSnapshot = async (label: string) => {
    const snap = await createManualSnapshot(label);
    setBackupFeedback(`Snapshot créé : "${snap.label}"`);
    return snap;
  };

  const handleExportJson = () => {
    const rawJson = exportCurrentSheetJson();
    const filename = buildBackupFilename(sheet);
    const blob = new Blob([rawJson], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setBackupFeedback(`Sauvegarde téléchargée : ${filename}`);
  };

  const handleImportJsonFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    const res = await importSheetJson(content);
    if (res.ok) {
      setBackupFeedback(
        `Import JSON réussi depuis "${file.name}" (snapshot de sécurité créé automatiquement).`,
      );
    } else {
      setBackupFeedback(null);
    }
    e.target.value = '';
  };

  const resetSessionRollUi = () => {
    setSelectedRollTarget(null);
    setIsDiceModalOpen(false);
    setRollLog([]);
  };

  const handleSwitchCharacter = async (characterId: string) => {
    await switchCharacter(characterId);
    resetSessionRollUi();
  };

  const handleCreateCharacter = async (name?: string) => {
    await createNewCharacter(name);
    resetSessionRollUi();
    setSheetMode('forge');
  };

  const handleDuplicateCharacter = async () => {
    await duplicateCurrentCharacter();
    resetSessionRollUi();
    setSheetMode('forge');
  };

  const handleLoadDemoCharacter = async () => {
    await loadDemoCharacter();
    resetSessionRollUi();
    setSheetMode('cockpit');
  };

  const handleDeleteCharacter = async (characterId: string) => {
    await deleteCharacter(characterId);
    resetSessionRollUi();
  };

  const syncDotClass =
    syncStatus === 'saved'
      ? 'sync-dot--saved'
      : syncStatus === 'pending'
        ? 'sync-dot--pending'
        : syncStatus === 'error'
          ? 'sync-dot--error'
          : '';

  const initials = sheet.identity.name
    .split(' ')
    .map((p) => p[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="app-shell">
      <header className="sheet-header">
        <div className="identity-block">
          <div className="portrait-frame" aria-hidden="true">
            {hasActiveCharacter ? (
              sheet.identity.portraitDataUrl ? (
                <img
                  src={sheet.identity.portraitDataUrl}
                  alt={`Portrait de ${sheet.identity.name}`}
                />
              ) : (
                initials
              )
            ) : (
              'G5'
            )}
          </div>
          <div className="identity-text">
            <h1>{hasActiveCharacter ? sheet.identity.name : 'Grimoire 5e'}</h1>
            {hasActiveCharacter ? (
              <p className="identity-subtitle">
                <span className="badge-pill">{sheet.identity.ancestry}</span>
                {sheet.identity.classes.map((cls) => (
                  <span key={cls.id} className="badge-pill">
                    {renderTerm(cls.name, cls.originalName)} {cls.level}
                    {cls.subclass ? ` (${cls.subclass.name})` : ''}
                  </span>
                ))}
                <span className="badge-pill tabular-nums">
                  Niveau {derived.totalLevel}
                </span>
              </p>
            ) : (
              <p className="identity-subtitle">
                <span className="badge-pill">Aucun personnage actif</span>
              </p>
            )}
          </div>
        </div>

        <div
          className="toolbar-controls"
          role="toolbar"
          aria-label="Contrôles de la fiche de personnage"
        >
          {hasActiveCharacter && (
            <>
              <div
                className="segmented-control"
                role="group"
                aria-label="Historique Annuler et Rétablir"
              >
                <button
                  type="button"
                  className="segmented-btn tabular-nums"
                  disabled={undoCount === 0}
                  onClick={undo}
                  title="Annuler la dernière modification en mémoire (Undo)"
                >
                  Annuler ({undoCount})
                </button>
                <button
                  type="button"
                  className="segmented-btn tabular-nums"
                  disabled={redoCount === 0}
                  onClick={redo}
                  title="Rétablir la modification annulée (Redo)"
                >
                  Rétablir ({redoCount})
                </button>
              </div>

              <div
                className="segmented-control"
                role="group"
                aria-label="Mode de la fiche"
              >
                <button
                  type="button"
                  className="segmented-btn"
                  aria-pressed={sheetMode === 'cockpit'}
                  onClick={() => setSheetMode('cockpit')}
                >
                  Mode Partie (Cockpit)
                </button>
                <button
                  type="button"
                  className="segmented-btn"
                  aria-pressed={sheetMode === 'forge'}
                  onClick={() => setSheetMode('forge')}
                >
                  Mode Édition (Forge)
                </button>
              </div>
            </>
          )}

          <div className="toolbar-utility-actions">
            <button
              type="button"
              className="action-btn roster-btn tabular-nums"
              onClick={() => characterDialogRef.current?.showModal()}
              aria-label={`Ouvrir la gestion des personnages (${characters.length})`}
              title="Changer de personnage, créer, dupliquer ou supprimer une fiche"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Personnages ({characters.length})</span>
            </button>

            <button
              type="button"
              className="action-btn settings-gear-btn"
              onClick={() => settingsDialogRef.current?.showModal()}
              aria-label="Ouvrir les paramètres, le stockage IndexedDB et les sauvegardes"
              title="Paramètres, Thème, Snapshots IndexedDB & Export/Import JSON"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Système</span>
              <span className={`sync-dot ${syncDotClass}`} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {isInitialized && !hasActiveCharacter ? (
        <main className="empty-roster-card grimoire-card">
          <h2>Aucun personnage dans votre grimoire</h2>
          <p className="muted-note">
            Créez un aventurier vierge pour commencer de zéro, chargez le personnage de démonstration pré-rempli ou importez une sauvegarde externe `.json`.
          </p>
          <div className="button-cluster empty-roster-actions">
            <button
              type="button"
              className="action-btn action-btn--primary"
              onClick={() => void handleCreateCharacter()}
            >
              Créer un personnage vierge
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={() => void handleLoadDemoCharacter()}
            >
              Charger la fiche démo (Kaelen Vance)
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={() => emptyImportInputRef.current?.click()}
            >
              Importer une fiche (.json)
            </button>
            <input
              ref={emptyImportInputRef}
              type="file"
              accept=".json,application/json"
              className="visually-hidden"
              onChange={(e) => void handleImportJsonFile(e)}
            />
          </div>
          {lastError && <div className="status-banner-error">{lastError}</div>}
        </main>
      ) : (
        <>
          {/* Bandeau Vital permanent (PV, CA, Initiative, États, Repos Court / Long) */}
          <VitalityBanner
            sheet={sheet}
            derived={derived}
            renderTerm={renderTerm}
            onSelectRollTarget={handleSelectRollTarget}
            onDamage={damage}
            onHeal={heal}
            onTempHp={tempHp}
            onToggleCondition={toggleCondition}
            onSetExhaustion={setExhaustionLevel}
            onSetDeathSaves={setDeathSaves}
            onOpenShortRest={() => shortRestDialogRef.current?.showModal()}
            onOpenLongRest={() => longRestDialogRef.current?.showModal()}
          />

          {sheetMode === 'forge' && (
            <div className="roll-banner" role="status">
              <strong>Mode Édition (Forge) - Onglets en cours de construction (Lots 4.2 à 4.4)</strong>
              <span>
                La gestion multi-personnages et la création de fiches vierges sont actives via le bouton « Personnages ». Les formulaires d’édition (identité/portrait, stats, compétences, armes, sorts et butin) arrivent dans les lots suivants du Jalon 4.
              </span>
            </div>
          )}

          {/* Grille principale élargie en 2 grandes colonnes (Caractéristiques/Compétences & Actions/Inventaire) */}
          <main className="workspace-grid">
            <AbilitiesAndSkillsPanel
              sheet={sheet}
              derived={derived}
              termMode={termMode}
              activeRollTargetId={activeRollTarget.id}
              renderTerm={renderTerm}
              onSelectRollTarget={handleSelectRollTarget}
            />

            <CombatAndResourcesPanel
              sheet={sheet}
              derived={derived}
              termMode={termMode}
              activeRollTargetId={activeRollTarget.id}
              renderTerm={renderTerm}
              onSelectRollTarget={handleSelectRollTarget}
              onAdjustResource={adjustResource}
              onAdjustSpellSlotUsed={adjustSpellSlotUsed}
              onAdjustPactSlotUsed={adjustPactSlotUsed}
              onUpdateNotes={updateNotes}
              onAppendQuickNote={appendQuickNote}
            />
          </main>

          {/* Assistant de Jet Hybride Universel (Modale flottante déplaçable sans flou + Bouton flottant FAB) */}
          <DiceAssistantPanel
            isOpen={isDiceModalOpen}
            onToggleOpen={setIsDiceModalOpen}
            diceRollMode={diceRollMode}
            activeTarget={activeRollTarget}
            hasExplicitTarget={selectedRollTarget !== null}
            rollLog={rollLog}
            renderTerm={renderTerm}
            onPushRollLog={pushRollLog}
            onClearRollLog={() => setRollLog([])}
          />

          <RestDialogs
            sheet={sheet}
            derived={derived}
            shortRestDialogRef={shortRestDialogRef}
            longRestDialogRef={longRestDialogRef}
            onConfirmShortRest={shortRest}
            onConfirmLongRest={longRestWithAutoSnapshot}
          />
        </>
      )}

      <CharacterSelectorDialog
        dialogRef={characterDialogRef}
        characters={characters}
        activeCharacterId={sheet.id}
        hasActiveCharacter={hasActiveCharacter}
        onSwitchCharacter={handleSwitchCharacter}
        onCreateNewCharacter={handleCreateCharacter}
        onDuplicateCurrentCharacter={handleDuplicateCharacter}
        onLoadDemoCharacter={handleLoadDemoCharacter}
        onDeleteCharacter={handleDeleteCharacter}
      />

      <SystemSettingsDialog
        dialogRef={settingsDialogRef}
        sheet={sheet}
        snapshots={snapshots}
        syncStatus={syncStatus}
        lastError={lastError}
        backupFeedback={backupFeedback}
        theme={theme}
        termMode={termMode}
        diceRollMode={diceRollMode}
        onSetTheme={setTheme}
        onSetTermMode={setTermMode}
        onSetDiceRollMode={setDiceRollMode}
        onCreateManualSnapshot={handleCreateManualSnapshot}
        onRestoreSnapshot={restoreSnapshot}
        onDeleteSnapshot={deleteSnapshot}
        onExportJson={handleExportJson}
        onImportJsonFile={handleImportJsonFile}
        onResetToDemo={resetToDemo}
      />
    </div>
  );
}
