import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  computeDerivedCharacter,
  resolveDamageRoll,
} from '../engine';
import type { TermDisplayMode, ThemeMode } from '../engine';
import { buildBackupFilename, useCharacterStore } from '../state';
import { AbilitiesAndSkillsPanel } from './components/AbilitiesAndSkillsPanel';
import { CombatAndResourcesPanel } from './components/CombatAndResourcesPanel';
import { DiceAssistantPanel } from './components/DiceAssistantPanel';
import type { RollLogEntry } from './components/DiceAssistantPanel';
import { RestDialogs } from './components/RestDialogs';
import { SystemSettingsDialog } from './components/SystemSettingsDialog';
import { VitalityBanner } from './components/VitalityBanner';
import type { ActiveRollTarget } from './components/dialog-utils';

type SheetMode = 'cockpit' | 'forge';

function getInitialTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function App() {
  const history = useCharacterStore((s) => s.history);
  const snapshots = useCharacterStore((s) => s.snapshots);
  const syncStatus = useCharacterStore((s) => s.syncStatus);
  const lastError = useCharacterStore((s) => s.lastError);

  const initialize = useCharacterStore((s) => s.initialize);
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

  const shortRestDialogRef = useRef<HTMLDialogElement>(null);
  const longRestDialogRef = useRef<HTMLDialogElement>(null);
  const settingsDialogRef = useRef<HTMLDialogElement>(null);

  const derived = computeDerivedCharacter(sheet);

  const defaultSkill =
    derived.skills.find((s) => s.id === 'stealth') ?? derived.skills[0];

  const [selectedRollTarget, setSelectedRollTarget] =
    useState<ActiveRollTarget | null>(null);
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

  const activeRollTarget: ActiveRollTarget = selectedRollTarget ?? {
    id: defaultSkill?.id ?? 'stealth',
    label: defaultSkill?.name ?? 'Discrétion',
    ...(defaultSkill?.originalName !== undefined
      ? { originalLabel: defaultSkill.originalName }
      : {}),
    category: 'skill',
    modifier: defaultSkill?.modifier ?? 0,
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

  const handleRollAttackDamage = (
    attackName: string,
    damageFormula: string,
    damageType: string,
    isCritical: boolean,
  ) => {
    const dmg = resolveDamageRoll(damageFormula, { isCritical });
    const timestamp = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    pushRollLog({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp,
      title: `${attackName} — Dégâts`,
      subtitle: isCritical
        ? `Critique (${damageType})`
        : `Normal (${damageType})`,
      formulaBreakdown: dmg.formulaBreakdown,
    });
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
            {sheet.identity.portraitDataUrl ? (
              <img
                src={sheet.identity.portraitDataUrl}
                alt={`Portrait de ${sheet.identity.name}`}
              />
            ) : (
              initials
            )}
          </div>
          <div className="identity-text">
            <h1>{sheet.identity.name}</h1>
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
          </div>
        </div>

        <div
          className="toolbar-controls"
          role="toolbar"
          aria-label="Contrôles de la fiche de personnage"
        >
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
      </header>

      {/* Bandeau Vital permanent (PV, CA, Initiative, États, Repos Court / Long) */}
      <VitalityBanner
        sheet={sheet}
        derived={derived}
        renderTerm={renderTerm}
        onSelectRollTarget={setSelectedRollTarget}
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
          <strong>Mode Édition (Forge) — Prévu au Jalon 4</strong>
          <span>
            L’éditeur complet de personnage (création multi-personnages, upload
            et compression du portrait, édition des caractéristiques, compétences
            homebrew, armes et sorts) sera construit lors du Jalon 4. Vous pouvez
            tester dès maintenant l’intégralité du Mode Partie (Cockpit) ci-dessous.
          </span>
        </div>
      )}

      {/* Grille principale 3 colonnes du Cockpit de Partie */}
      <main className="workspace-grid">
        <AbilitiesAndSkillsPanel
          sheet={sheet}
          derived={derived}
          termMode={termMode}
          activeRollTargetId={activeRollTarget.id}
          renderTerm={renderTerm}
          onSelectRollTarget={setSelectedRollTarget}
        />

        <CombatAndResourcesPanel
          sheet={sheet}
          derived={derived}
          termMode={termMode}
          activeRollTargetId={activeRollTarget.id}
          renderTerm={renderTerm}
          onSelectRollTarget={setSelectedRollTarget}
          onRollAttackDamage={handleRollAttackDamage}
          onAdjustResource={adjustResource}
          onAdjustSpellSlotUsed={adjustSpellSlotUsed}
          onAdjustPactSlotUsed={adjustPactSlotUsed}
          onUpdateNotes={updateNotes}
          onAppendQuickNote={appendQuickNote}
        />

        <DiceAssistantPanel
          activeTarget={activeRollTarget}
          rollLog={rollLog}
          renderTerm={renderTerm}
          onPushRollLog={pushRollLog}
          onClearRollLog={() => setRollLog([])}
        />
      </main>

      <RestDialogs
        sheet={sheet}
        derived={derived}
        shortRestDialogRef={shortRestDialogRef}
        longRestDialogRef={longRestDialogRef}
        onConfirmShortRest={shortRest}
        onConfirmLongRest={longRestWithAutoSnapshot}
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
        onSetTheme={setTheme}
        onSetTermMode={setTermMode}
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
