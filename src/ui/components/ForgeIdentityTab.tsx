import { useId, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { Draft } from 'immer';
import {
  ABILITY_GLOSSARY,
  ABILITY_KEYS,
  HIT_DIE_SIZES,
  formatSignedModifier,
  syncHitDicePoolsWithClasses,
} from '../../engine';
import type {
  AbilityKey,
  CharacterSheetV1,
  DerivedCharacterStats,
  HitDieSize,
} from '../../engine';
import { CommittedTextInput, NumberStepper } from './ForgeSharedControls';
import { DEFAULT_PORTRAIT_URL, compressPortraitFile } from './portrait-utils';

export interface ForgeIdentityTabProps {
  sheet: CharacterSheetV1;
  derived: DerivedCharacterStats;
  onMutate: (recipe: (draft: Draft<CharacterSheetV1>) => void) => void;
}

export function ForgeIdentityTab({
  sheet,
  derived,
  onMutate,
}: ForgeIdentityTabProps) {
  const baseId = useId();
  const portraitInputRef = useRef<HTMLInputElement>(null);
  const [portraitFeedback, setPortraitFeedback] = useState<string | null>(null);
  const [portraitError, setPortraitError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const handlePortraitSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPortraitError(null);
    setPortraitFeedback(null);
    setIsCompressing(true);

    try {
      const compressed = await compressPortraitFile(file);
      onMutate((draft) => {
        draft.identity.portraitDataUrl = compressed.dataUrl;
      });
      setPortraitFeedback('Portrait mis à jour.');
    } catch (err) {
      setPortraitError(
        err instanceof Error
          ? err.message
          : 'Erreur lors du traitement du portrait.',
      );
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemovePortrait = () => {
    onMutate((draft) => {
      delete draft.identity.portraitDataUrl;
    });
    setPortraitError(null);
    setPortraitFeedback('Portrait retiré.');
  };

  const handleAddClass = () => {
    const newId = `class-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    onMutate((draft) => {
      draft.identity.classes.push({
        id: newId,
        name: 'Nouvelle classe',
        level: 1,
        hitDieSize: 8,
      });
      draft.combat.hitDicePools = syncHitDicePoolsWithClasses(
        draft.combat.hitDicePools,
        draft.identity.classes,
      );
    });
  };

  const handleRemoveClass = (classId: string) => {
    if (sheet.identity.classes.length <= 1) return;
    onMutate((draft) => {
      draft.identity.classes = draft.identity.classes.filter(
        (c) => c.id !== classId,
      );
      draft.combat.hitDicePools = syncHitDicePoolsWithClasses(
        draft.combat.hitDicePools,
        draft.identity.classes,
      );
    });
  };

  return (
    <div className="forge-grid">
      {/* Bloc 1 : Identité & Portrait */}
      <section className="grimoire-card forge-card" aria-label="Identité et portrait">
        <h2>Identité & Portrait</h2>

        <div className="forge-portrait-row">
          <div className="portrait-frame portrait-frame--large" aria-hidden="true">
            <img
              src={sheet.identity.portraitDataUrl ?? DEFAULT_PORTRAIT_URL}
              alt={`Portrait de ${sheet.identity.name}`}
            />
          </div>

          <div className="forge-portrait-controls">
            <div className="button-cluster">
              <button
                type="button"
                className="action-btn action-btn--primary"
                disabled={isCompressing}
                onClick={() => portraitInputRef.current?.click()}
              >
                {isCompressing
                  ? 'Importation en cours...'
                  : sheet.identity.portraitDataUrl
                    ? 'Changer le portrait'
                    : 'Importer un portrait'}
              </button>
              {sheet.identity.portraitDataUrl && (
                <button
                  type="button"
                  className="action-btn"
                  onClick={handleRemovePortrait}
                >
                  Retirer
                </button>
              )}
              <input
                ref={portraitInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="visually-hidden"
                aria-label="Choisir une image de portrait"
                onChange={(e) => void handlePortraitSelected(e)}
              />
            </div>
            <p className="muted-note">
              Formats acceptés : PNG, JPG ou WebP (taille ajustée automatiquement).
            </p>
            <div aria-live="polite">
              {portraitFeedback && (
                <p className="muted-note" style={{ color: 'var(--color-hp-ok)' }}>
                  {portraitFeedback}
                </p>
              )}
              {portraitError && (
                <div className="status-banner-error">{portraitError}</div>
              )}
            </div>
          </div>
        </div>

        <fieldset className="forge-fieldset">
          <legend>Informations civiles</legend>

          <div className="field-group">
            <label htmlFor={`${baseId}-name`}>Nom du personnage *</label>
            <CommittedTextInput
              id={`${baseId}-name`}
              name="characterName"
              value={sheet.identity.name}
              required
              maxLength={80}
              placeholder="Ex. Kaelen Vance"
              onCommit={(val) =>
                onMutate((draft) => {
                  draft.identity.name = val.trim() || 'Personnage sans nom';
                })
              }
            />
          </div>

          <div className="forge-two-cols">
            <div className="field-group">
              <label htmlFor={`${baseId}-ancestry`}>Ascendance / Espèce</label>
              <CommittedTextInput
                id={`${baseId}-ancestry`}
                name="ancestry"
                value={sheet.identity.ancestry}
                maxLength={80}
                placeholder="Ex. Humain (Variant), Elfe..."
                onCommit={(val) =>
                  onMutate((draft) => {
                    draft.identity.ancestry = val.trim();
                  })
                }
              />
            </div>

            <div className="field-group">
              <label htmlFor={`${baseId}-background`}>Historique</label>
              <CommittedTextInput
                id={`${baseId}-background`}
                name="background"
                value={sheet.identity.background}
                maxLength={80}
                placeholder="Ex. Éclaireur du Secteur Zéro..."
                onCommit={(val) =>
                  onMutate((draft) => {
                    draft.identity.background = val.trim();
                  })
                }
              />
            </div>
          </div>
        </fieldset>
      </section>

      {/* Bloc 2 : Classes */}
      <section className="grimoire-card forge-card" aria-label="Classes">
        <div className="forge-card-header">
          <div>
            <h2>Classes</h2>
            <p className="muted-note tabular-nums">
              Niveau global : {derived.totalLevel} · Bonus de Maîtrise :{' '}
              {formatSignedModifier(derived.proficiencyBonus)}
            </p>
          </div>
          <button
            type="button"
            className="action-btn action-btn--primary"
            onClick={handleAddClass}
          >
            + Ajouter une classe
          </button>
        </div>

        <div className="forge-repeat-list">
          {sheet.identity.classes.map((cls, index) => (
            <fieldset key={cls.id} className="forge-item-card">
              <legend>
                Classe {index + 1} : {cls.name || 'Sans nom'} (Niv. {cls.level})
              </legend>

              <div className="forge-two-cols">
                <div className="field-group">
                  <label htmlFor={`${baseId}-cls-name-${cls.id}`}>Nom (FR)</label>
                  <CommittedTextInput
                    id={`${baseId}-cls-name-${cls.id}`}
                    name={`class-name-${cls.id}`}
                    value={cls.name}
                    required
                    maxLength={60}
                    placeholder="Ex. Rôdeur"
                    onCommit={(val) =>
                      onMutate((draft) => {
                        const target = draft.identity.classes.find(
                          (c) => c.id === cls.id,
                        );
                        if (target) target.name = val.trim() || 'Classe';
                      })
                    }
                  />
                </div>

                <div className="field-group">
                  <label htmlFor={`${baseId}-cls-vo-${cls.id}`}>
                    Nom VO (optionnel)
                  </label>
                  <CommittedTextInput
                    id={`${baseId}-cls-vo-${cls.id}`}
                    name={`class-vo-${cls.id}`}
                    value={cls.originalName ?? ''}
                    maxLength={60}
                    placeholder="Ex. Ranger"
                    onCommit={(val) =>
                      onMutate((draft) => {
                        const target = draft.identity.classes.find(
                          (c) => c.id === cls.id,
                        );
                        if (!target) return;
                        const trimmed = val.trim();
                        if (trimmed) {
                          target.originalName = trimmed;
                        } else {
                          delete target.originalName;
                        }
                      })
                    }
                  />
                </div>
              </div>

              <div className="forge-two-cols">
                <div className="field-group">
                  <label htmlFor={`${baseId}-cls-sub-${cls.id}`}>
                    Sous-classe (optionnelle)
                  </label>
                  <CommittedTextInput
                    id={`${baseId}-cls-sub-${cls.id}`}
                    name={`class-sub-${cls.id}`}
                    value={cls.subclass?.name ?? ''}
                    maxLength={60}
                    placeholder="Ex. Traqueur des Ruines"
                    onCommit={(val) =>
                      onMutate((draft) => {
                        const target = draft.identity.classes.find(
                          (c) => c.id === cls.id,
                        );
                        if (!target) return;
                        const trimmed = val.trim();
                        if (trimmed) {
                          target.subclass = {
                            ...(target.subclass ?? { name: trimmed }),
                            name: trimmed,
                          };
                        } else {
                          delete target.subclass;
                        }
                      })
                    }
                  />
                </div>

                <div className="field-group">
                  <label htmlFor={`${baseId}-cls-subvo-${cls.id}`}>
                    Sous-classe VO (optionnelle)
                  </label>
                  <CommittedTextInput
                    id={`${baseId}-cls-subvo-${cls.id}`}
                    name={`class-subvo-${cls.id}`}
                    value={cls.subclass?.originalName ?? ''}
                    maxLength={60}
                    placeholder="Ex. Gloom Stalker"
                    onCommit={(val) =>
                      onMutate((draft) => {
                        const target = draft.identity.classes.find(
                          (c) => c.id === cls.id,
                        );
                        if (!target || !target.subclass) return;
                        const trimmed = val.trim();
                        if (trimmed) {
                          target.subclass.originalName = trimmed;
                        } else {
                          delete target.subclass.originalName;
                        }
                      })
                    }
                  />
                </div>
              </div>

              <div className="forge-three-cols">
                <div className="field-group">
                  <label htmlFor={`${baseId}-cls-lvl-${cls.id}`}>Niveau</label>
                  <NumberStepper
                    id={`${baseId}-cls-lvl-${cls.id}`}
                    name={`class-level-${cls.id}`}
                    value={cls.level}
                    min={1}
                    max={20}
                    decrementLabel={`Baisser le niveau de ${cls.name}`}
                    incrementLabel={`Monter le niveau de ${cls.name}`}
                    onChange={(nextLevel) =>
                      onMutate((draft) => {
                        const target = draft.identity.classes.find(
                          (c) => c.id === cls.id,
                        );
                        if (!target) return;
                        target.level = Math.trunc(nextLevel);
                        draft.combat.hitDicePools = syncHitDicePoolsWithClasses(
                          draft.combat.hitDicePools,
                          draft.identity.classes,
                        );
                      })
                    }
                  />
                </div>

                <div className="field-group">
                  <label htmlFor={`${baseId}-cls-hd-${cls.id}`}>Dé de Vie</label>
                  <select
                    id={`${baseId}-cls-hd-${cls.id}`}
                    name={`class-hd-${cls.id}`}
                    className="forge-select tabular-nums"
                    value={cls.hitDieSize}
                    onChange={(e) => {
                      const nextSize = Number(e.target.value) as HitDieSize;
                      onMutate((draft) => {
                        const target = draft.identity.classes.find(
                          (c) => c.id === cls.id,
                        );
                        if (!target) return;
                        target.hitDieSize = nextSize;
                        draft.combat.hitDicePools = syncHitDicePoolsWithClasses(
                          draft.combat.hitDicePools,
                          draft.identity.classes,
                        );
                      });
                    }}
                  >
                    {HIT_DIE_SIZES.map((dieSize) => (
                      <option key={dieSize} value={dieSize}>
                        d{dieSize}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field-group">
                  <label htmlFor={`${baseId}-cls-cast-${cls.id}`}>
                    Incantation
                  </label>
                  <select
                    id={`${baseId}-cls-cast-${cls.id}`}
                    name={`class-cast-${cls.id}`}
                    className="forge-select"
                    value={cls.spellcastingAbility ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      onMutate((draft) => {
                        const target = draft.identity.classes.find(
                          (c) => c.id === cls.id,
                        );
                        if (!target) return;
                        if (raw === '') {
                          delete target.spellcastingAbility;
                        } else {
                          target.spellcastingAbility = raw as AbilityKey;
                        }
                      });
                    }}
                  >
                    <option value="">Aucune</option>
                    {ABILITY_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {ABILITY_GLOSSARY[key].abbrFr} ({ABILITY_GLOSSARY[key].name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="forge-item-footer">
                <button
                  type="button"
                  className="action-btn"
                  disabled={sheet.identity.classes.length <= 1}
                  onClick={() => handleRemoveClass(cls.id)}
                >
                  Supprimer cette classe
                </button>
              </div>
            </fieldset>
          ))}
        </div>
      </section>
    </div>
  );
}
