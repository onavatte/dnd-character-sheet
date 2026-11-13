import { useId, useState } from 'react';
import type { FormEvent, RefObject } from 'react';
import { computeTotalLevel } from '../../engine';
import type { CharacterSheetV1 } from '../../engine';
import { handleDialogBackdropClick } from './dialog-utils';

export interface CharacterSelectorDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  characters: CharacterSheetV1[];
  activeCharacterId: string;
  hasActiveCharacter: boolean;
  onSwitchCharacter: (characterId: string) => Promise<void>;
  onCreateNewCharacter: (name?: string) => Promise<void>;
  onDuplicateCurrentCharacter: () => Promise<void>;
  onLoadDemoCharacter: () => Promise<void>;
  onDeleteCharacter: (characterId: string) => Promise<void>;
}

export function CharacterSelectorDialog({
  dialogRef,
  characters,
  activeCharacterId,
  hasActiveCharacter,
  onSwitchCharacter,
  onCreateNewCharacter,
  onDuplicateCurrentCharacter,
  onLoadDemoCharacter,
  onDeleteCharacter,
}: CharacterSelectorDialogProps) {
  const titleId = useId();
  const newNameInputId = useId();
  const [newName, setNewName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onCreateNewCharacter(newName);
    setNewName('');
    setConfirmDeleteId(null);
    dialogRef.current?.close();
  };

  const handleSelectCharacter = async (characterId: string) => {
    setConfirmDeleteId(null);
    await onSwitchCharacter(characterId);
    dialogRef.current?.close();
  };

  const handleConfirmDelete = async (characterId: string) => {
    setConfirmDeleteId(null);
    await onDeleteCharacter(characterId);
  };

  return (
    <dialog
      ref={dialogRef}
      className="grimoire-dialog grimoire-dialog--wide"
      aria-labelledby={titleId}
      onClick={handleDialogBackdropClick}
      onClose={() => setConfirmDeleteId(null)}
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      <div className="dialog-header">
        <h2 id={titleId}>Mes Personnages ({characters.length})</h2>
        <form method="dialog">
          <button type="submit" className="action-btn" autoFocus>
            Fermer
          </button>
        </form>
      </div>

      {/* Création / Duplication / Démo */}
      <div className="settings-section">
        <h3>Créer ou Ajouter un Personnage</h3>
        <form className="field-group" onSubmit={(e) => void handleCreateSubmit(e)}>
          <label htmlFor={newNameInputId}>Nom du nouveau personnage vierge :</label>
          <div className="inline-input-row">
            <input
              id={newNameInputId}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex. Lyra Ashborne..."
            />
            <button type="submit" className="action-btn action-btn--primary">
              Créer & Éditer
            </button>
          </div>
        </form>

        <div className="button-cluster" style={{ marginTop: 'var(--space-2)' }}>
          <button
            type="button"
            className="action-btn"
            disabled={!hasActiveCharacter}
            onClick={() => {
              void onDuplicateCurrentCharacter().then(() => {
                setConfirmDeleteId(null);
                dialogRef.current?.close();
              });
            }}
          >
            Dupliquer le personnage actif
          </button>
          <button
            type="button"
            className="action-btn"
            onClick={() => {
              void onLoadDemoCharacter().then(() => {
                setConfirmDeleteId(null);
                dialogRef.current?.close();
              });
            }}
          >
            Ajouter la fiche démo (Kaelen)
          </button>
        </div>
      </div>

      {/* Liste des personnages sauvegardés */}
      <div className="settings-section">
        <h3>Fiches enregistrées (IndexedDB)</h3>
        {characters.length === 0 ? (
          <div className="stat-preview-row">
            <span className="muted-note">
              Aucune fiche enregistrée pour le moment. Créez un personnage ci-dessus ou chargez la fiche démo.
            </span>
          </div>
        ) : (
          <div className="character-roster-list">
            {characters.map((char) => {
              const isActive = hasActiveCharacter && char.id === activeCharacterId;
              const isConfirmingDelete = confirmDeleteId === char.id;
              const totalLevel = computeTotalLevel(char.identity.classes);
              const classesLabel = char.identity.classes
                .map((cls) => `${cls.name} ${cls.level}`)
                .join(' / ');
              const initials = char.identity.name
                .split(' ')
                .map((part) => part[0] ?? '')
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={char.id}
                  className={`character-roster-card ${
                    isActive ? 'character-roster-card--active' : ''
                  }`}
                >
                  <div className="character-roster-main">
                    <div className="roster-avatar" aria-hidden="true">
                      {char.identity.portraitDataUrl ? (
                        <img
                          src={char.identity.portraitDataUrl}
                          alt={`Portrait de ${char.identity.name}`}
                        />
                      ) : (
                        initials || '?'
                      )}
                    </div>
                    <div className="character-roster-meta">
                      <div className="character-roster-title-row">
                        <strong>{char.identity.name}</strong>
                        {isActive && (
                          <span className="badge-pill badge-pill--active">Actif</span>
                        )}
                      </div>
                      <div className="attack-meta tabular-nums">
                        Niv. {totalLevel} ({classesLabel}) · PV {char.combat.hpCurrent}/
                        {char.combat.hpMax} · Rév. #{char.revision}
                      </div>
                    </div>
                  </div>

                  <div className="character-roster-actions">
                    {!isConfirmingDelete ? (
                      <>
                        {!isActive && (
                          <button
                            type="button"
                            className="action-btn action-btn--primary"
                            onClick={() => void handleSelectCharacter(char.id)}
                          >
                            Charger
                          </button>
                        )}
                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => setConfirmDeleteId(char.id)}
                        >
                          Supprimer
                        </button>
                      </>
                    ) : (
                      <div
                        className="button-cluster"
                        role="group"
                        aria-label={`Confirmer la suppression de ${char.identity.name}`}
                      >
                        <button
                          type="button"
                          className="action-btn action-btn--danger"
                          onClick={() => void handleConfirmDelete(char.id)}
                        >
                          Confirmer suppression
                        </button>
                        <button
                          type="button"
                          className="action-btn"
                          autoFocus
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Annuler
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </dialog>
  );
}
