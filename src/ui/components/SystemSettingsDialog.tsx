import { useId, useState } from 'react';
import type { RefObject } from 'react';
import type {
  CharacterSheetV1,
  CharacterSnapshot,
  TermDisplayMode,
  ThemeMode,
} from '../../engine';
import type { SaveSyncStatus } from '../../state';
import { handleDialogBackdropClick } from './dialog-utils';
import type { DiceRollMode } from './dialog-utils';

export interface SystemSettingsDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  sheet: CharacterSheetV1;
  snapshots: CharacterSnapshot[];
  syncStatus: SaveSyncStatus;
  lastError: string | null;
  backupFeedback: string | null;
  theme: ThemeMode;
  termMode: TermDisplayMode;
  diceRollMode: DiceRollMode;
  onSetTheme: (theme: ThemeMode) => void;
  onSetTermMode: (mode: TermDisplayMode) => void;
  onSetDiceRollMode: (mode: DiceRollMode) => void;
  onCreateManualSnapshot: (label: string) => Promise<CharacterSnapshot>;
  onRestoreSnapshot: (snapshotId: string) => Promise<void>;
  onDeleteSnapshot: (snapshotId: string) => Promise<void>;
}

export function SystemSettingsDialog({
  dialogRef,
  sheet,
  snapshots,
  syncStatus,
  lastError,
  backupFeedback,
  theme,
  termMode,
  diceRollMode,
  onSetTheme,
  onSetTermMode,
  onSetDiceRollMode,
  onCreateManualSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
}: SystemSettingsDialogProps) {
  const titleId = useId();
  const [snapshotLabel, setSnapshotLabel] = useState('');

  const handleCapture = async () => {
    await onCreateManualSnapshot(snapshotLabel);
    setSnapshotLabel('');
  };

  const syncLabel =
    syncStatus === 'saved'
      ? 'Enregistré sur cet appareil'
      : syncStatus === 'pending'
        ? 'Enregistrement en cours...'
        : syncStatus === 'error'
          ? 'Erreur d’enregistrement'
          : 'Prêt';

  const formattedUpdatedAt = (() => {
    try {
      return new Date(sheet.updatedAt).toLocaleString('fr-FR');
    } catch {
      return sheet.updatedAt;
    }
  })();

  return (
    <dialog
      ref={dialogRef}
      className="grimoire-dialog grimoire-dialog--wide"
      aria-labelledby={titleId}
      onClick={handleDialogBackdropClick}
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      <div className="dialog-header">
        <h2 id={titleId}>Paramètres & Sauvegardes</h2>
        <form method="dialog">
          <button type="submit" className="action-btn" autoFocus>
            Fermer
          </button>
        </form>
      </div>

      {/* Préférences d'affichage et de jeu (Thème, Langue & Mode de dés) */}
      <div className="settings-section">
        <h3>Préférences d’affichage et de jeu</h3>
        <div className="settings-row">
          <span>Thème visuel :</span>
          <div
            className="segmented-control"
            role="group"
            aria-label="Choix du thème visuel"
          >
            <button
              type="button"
              className="segmented-btn"
              aria-pressed={theme === 'light'}
              onClick={() => onSetTheme('light')}
            >
              Clair (Ivoire & Encre)
            </button>
            <button
              type="button"
              className="segmented-btn"
              aria-pressed={theme === 'dark'}
              onClick={() => onSetTheme('dark')}
            >
              Sombre (Obsidienne & Or)
            </button>
          </div>
        </div>

        <div className="settings-row">
          <span>Affichage des termes D&D 5e :</span>
          <div
            className="segmented-control"
            role="group"
            aria-label="Langue d'affichage des termes D&D 5e"
          >
            <button
              type="button"
              className="segmented-btn"
              aria-pressed={termMode === 'bilingual'}
              onClick={() => onSetTermMode('bilingual')}
            >
              Bilingue (FR · EN)
            </button>
            <button
              type="button"
              className="segmented-btn"
              aria-pressed={termMode === 'fr'}
              onClick={() => onSetTermMode('fr')}
            >
              Français (FR)
            </button>
            <button
              type="button"
              className="segmented-btn"
              aria-pressed={termMode === 'en'}
              onClick={() => onSetTermMode('en')}
            >
              Anglais (EN)
            </button>
          </div>
        </div>

        <div className="settings-row">
          <span>Mode de lancer des dés :</span>
          <div
            className="segmented-control"
            role="group"
            aria-label="Mode de lancer des dés dans l'assistant"
          >
            <button
              type="button"
              className="segmented-btn"
              aria-pressed={diceRollMode === 'physical'}
              onClick={() => onSetDiceRollMode('physical')}
            >
              Dés Physiques (Pavé)
            </button>
            <button
              type="button"
              className="segmented-btn"
              aria-pressed={diceRollMode === 'virtual'}
              onClick={() => onSetDiceRollMode('virtual')}
            >
              Dés Virtuels (Aléatoire)
            </button>
          </div>
        </div>
      </div>

      {/* État de la sauvegarde automatique */}
      <div className="settings-section">
        <h3>Sauvegarde automatique</h3>
        <div className="stat-preview-row">
          <div>
            <strong>{syncLabel}</strong>
            <div className="attack-meta tabular-nums">
              Dernière modification : {formattedUpdatedAt}
            </div>
          </div>
          <span className="badge-pill tabular-nums">
            Révision #{sheet.revision}
          </span>
        </div>
      </div>

      {/* Points de restauration */}
      <div className="settings-section">
        <h3>Points de restauration ({snapshots.length})</h3>
        <div className="field-group">
          <label htmlFor="settings-snapshot-label">
            Créer un point de restauration manuel :
          </label>
          <div className="inline-input-row">
            <input
              id="settings-snapshot-label"
              type="text"
              value={snapshotLabel}
              onChange={(e) => setSnapshotLabel(e.target.value)}
              placeholder="Ex. Avant le boss du donjon..."
            />
            <button
              type="button"
              className="action-btn action-btn--primary"
              onClick={() => void handleCapture()}
            >
              Capturer
            </button>
          </div>
        </div>

        <div className="snapshot-list">
          {snapshots.length === 0 ? (
            <div className="stat-preview-row">
              <span className="muted-note">
                Aucun point de restauration enregistré. Un point de restauration
                est créé automatiquement avant chaque Repos Long ou Import JSON.
              </span>
            </div>
          ) : (
            snapshots.map((snap) => (
              <div key={snap.snapshotId} className="snapshot-row">
                <div>
                  <strong>{snap.label}</strong>
                  <div
                    className="tabular-nums"
                    style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
                  >
                    PV {snap.payload.combat.hpCurrent}/
                    {snap.payload.combat.hpMax} · Rév. #{snap.payload.revision}
                  </div>
                </div>
                <div className="button-cluster">
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => void onRestoreSnapshot(snap.snapshotId)}
                  >
                    Restaurer
                  </button>
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => void onDeleteSnapshot(snap.snapshotId)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div aria-live="polite">
          {backupFeedback && (
            <div className="roll-banner" style={{ fontSize: '0.875rem' }}>
              {backupFeedback}
            </div>
          )}
          {lastError && <div className="status-banner-error">{lastError}</div>}
        </div>
      </div>
    </dialog>
  );
}
