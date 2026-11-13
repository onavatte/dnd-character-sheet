import { useId, useState } from 'react';
import type { Draft } from 'immer';
import {
  ABILITY_GLOSSARY,
  ABILITY_KEYS,
  formatSignedModifier,
} from '../../engine';
import type {
  AbilityKey,
  CharacterSheetV1,
  DerivedCharacterStats,
  SpellAbilityEntry,
} from '../../engine';
import { SPELL_LEVEL_OPTIONS } from './forge-constants';
import {
  CommittedTextArea,
  CommittedTextInput,
  NumberStepper,
} from './ForgeSharedControls';

const SLOT_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export interface ForgeSpellcastingSectionProps {
  sheet: CharacterSheetV1;
  derived: DerivedCharacterStats;
  onMutate: (recipe: (draft: Draft<CharacterSheetV1>) => void) => void;
}

/**
 * Éditeur complet d'incantation, d'emplacements de sorts (Repos Long / Pacte) et du grimoire.
 */
export function ForgeSpellcastingSection({
  sheet,
  derived,
  onMutate,
}: ForgeSpellcastingSectionProps) {
  const baseId = useId();
  const [expandedSpellIds, setExpandedSpellIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [levelFilter, setLevelFilter] = useState<'all' | number>('all');
  const [confirmDisable, setConfirmDisable] = useState(false);

  const spellcasting = sheet.spellcasting;
  const inferredAbility =
    sheet.identity.classes.find((cls) => cls.spellcastingAbility !== undefined)
      ?.spellcastingAbility ?? 'WIS';

  const handleEnableSpellcasting = () => {
    setConfirmDisable(false);
    onMutate((draft) => {
      if (draft.spellcasting) return;
      draft.spellcasting = {
        defaultAbility: inferredAbility,
        slots: { 1: { max: 2, used: 0 } },
        abilitiesList: [],
      };
    });
  };

  const handleDisableSpellcasting = () => {
    if (!spellcasting) return;
    const hasContent =
      spellcasting.abilitiesList.length > 0 ||
      Object.keys(spellcasting.slots).length > 0 ||
      spellcasting.pactSlots !== undefined;

    if (hasContent && !confirmDisable) {
      setConfirmDisable(true);
      return;
    }

    setConfirmDisable(false);
    onMutate((draft) => {
      delete draft.spellcasting;
    });
  };

  if (!spellcasting) {
    return (
      <section
        className="grimoire-card forge-card"
        aria-labelledby={`${baseId}-spellcasting-title`}
      >
        <div className="forge-card-header">
          <div>
            <h2 id={`${baseId}-spellcasting-title`} className="panel-title">
              Incantation, Emplacements & Grimoire
            </h2>
            <p className="muted-caption">
              Ce personnage n&apos;a pas encore de grimoire ni d&apos;emplacements de sorts configurés.
            </p>
          </div>
          <button
            type="button"
            className="action-btn action-btn--primary"
            onClick={handleEnableSpellcasting}
          >
            + Activer le grimoire de sorts
          </button>
        </div>
      </section>
    );
  }

  const activeSlotLevels = SLOT_LEVELS.filter(
    (lvl) => spellcasting.slots[lvl] !== undefined,
  );
  const availableSlotLevels = SLOT_LEVELS.filter(
    (lvl) => spellcasting.slots[lvl] === undefined,
  );
  const spellAbilityStats = Object.entries(derived.spellcastingByAbility) as [
    AbilityKey,
    { saveDC: number; attackBonus: number },
  ][];

  const sortedSpells = [...spellcasting.abilitiesList]
    .sort((a, b) => a.level - b.level)
    .filter((spell) => levelFilter === 'all' || spell.level === levelFilter);

  const mutateSpell = (
    spellId: string,
    recipe: (target: Draft<SpellAbilityEntry>) => void,
  ) => {
    onMutate((draft) => {
      const target = draft.spellcasting?.abilitiesList.find(
        (s) => s.id === spellId,
      );
      if (target) {
        recipe(target);
      }
    });
  };

  const handleAddSpell = () => {
    const newId = `spell-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const initialLevel = levelFilter === 'all' ? 0 : levelFilter;
    onMutate((draft) => {
      draft.spellcasting ??= {
        defaultAbility: inferredAbility,
        slots: {},
        abilitiesList: [],
      };
      draft.spellcasting.abilitiesList.push({
        id: newId,
        name: 'Nouveau sort',
        level: initialLevel,
        prepared: true,
        castingTime: 'Action',
        range: '18 m',
        description: '',
      });
    });
    setExpandedSpellIds((prev) => {
      const next = new Set(prev);
      next.add(newId);
      return next;
    });
  };

  const handleRemoveSpell = (spellId: string) => {
    onMutate((draft) => {
      if (!draft.spellcasting) return;
      draft.spellcasting.abilitiesList =
        draft.spellcasting.abilitiesList.filter((s) => s.id !== spellId);
    });
    setExpandedSpellIds((prev) => {
      if (!prev.has(spellId)) return prev;
      const next = new Set(prev);
      next.delete(spellId);
      return next;
    });
  };

  const toggleSpellExpanded = (spellId: string) => {
    setExpandedSpellIds((prev) => {
      const next = new Set(prev);
      if (next.has(spellId)) {
        next.delete(spellId);
      } else {
        next.add(spellId);
      }
      return next;
    });
  };

  return (
    <section
      className="grimoire-card forge-card"
      aria-labelledby={`${baseId}-spellcasting-title`}
    >
      <div className="forge-card-header">
        <div>
          <h2 id={`${baseId}-spellcasting-title`} className="panel-title">
            Incantation, Emplacements & Grimoire
          </h2>
          <p className="muted-caption">
            Caractéristique d&apos;incantation, emplacements de Repos Long, Magie de Pacte et sorts préparés.
          </p>
        </div>

        <div className="button-cluster">
          {confirmDisable ? (
            <>
              <button
                type="button"
                className="action-btn action-btn--danger"
                onClick={handleDisableSpellcasting}
              >
                Confirmer la suppression
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={() => setConfirmDisable(false)}
              >
                Annuler
              </button>
            </>
          ) : (
            <button
              type="button"
              className="action-btn"
              onClick={handleDisableSpellcasting}
            >
              Désactiver le grimoire
            </button>
          )}
        </div>
      </div>

      {/* Sous-bloc 1 : Caractéristique d'incantation & Aperçu DD / Toucher */}
      <fieldset className="forge-fieldset">
        <legend>Paramètres d&apos;incantation</legend>
        <div className="forge-spell-overview">
          <div className="field-group">
            <label htmlFor={`${baseId}-spell-default-abil`}>
              Caractéristique par défaut
            </label>
            <select
              id={`${baseId}-spell-default-abil`}
              name="defaultSpellAbility"
              className="forge-select"
              value={spellcasting.defaultAbility}
              onChange={(e) => {
                const nextAbility = e.target.value as AbilityKey;
                onMutate((draft) => {
                  if (draft.spellcasting) {
                    draft.spellcasting.defaultAbility = nextAbility;
                  }
                });
              }}
            >
              {ABILITY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {ABILITY_GLOSSARY[key].name} ({ABILITY_GLOSSARY[key].abbrFr})
                </option>
              ))}
            </select>
          </div>

          <div
            className="forge-spell-kpi-grid"
            aria-label="Aperçu DD et bonus d'attaque des sorts"
          >
            {spellAbilityStats.map(([abilityKey, stats]) => (
              <div key={abilityKey} className="forge-spell-kpi-card">
                <span className="forge-kpi-label">
                  {ABILITY_GLOSSARY[abilityKey].abbrFr}
                </span>
                <div className="forge-entry-badges tabular-nums">
                  <span className="badge-pill badge-pill--active">
                    DD {stats.saveDC}
                  </span>
                  <span className="badge-pill">
                    Toucher {formatSignedModifier(stats.attackBonus)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </fieldset>

      {/* Sous-bloc 2 : Emplacements de sorts (Repos Long) */}
      <fieldset className="forge-fieldset">
        <legend>Emplacements de sorts (Repos Long)</legend>
        {activeSlotLevels.length === 0 ? (
          <p className="muted-caption">
            Aucun emplacement configuré. Ajoutez un niveau de sort ci-dessous.
          </p>
        ) : (
          <div className="forge-slots-grid">
            {activeSlotLevels.map((level) => {
              const slot = spellcasting.slots[level];
              if (!slot) return null;

              return (
                <div key={level} className="forge-slot-card">
                  <div className="forge-slot-card-header">
                    <strong>Niveau {level}</strong>
                    <button
                      type="button"
                      className="action-btn"
                      aria-label={`Retirer les emplacements de niveau ${level}`}
                      onClick={() =>
                        onMutate((draft) => {
                          if (!draft.spellcasting) return;
                          const nextSlots: Record<
                            number,
                            { max: number; used: number }
                          > = {};
                          for (const [k, v] of Object.entries(
                            draft.spellcasting.slots,
                          )) {
                            if (Number(k) !== level) {
                              nextSlots[Number(k)] = v;
                            }
                          }
                          draft.spellcasting.slots = nextSlots;
                        })
                      }
                    >
                      Retirer
                    </button>
                  </div>

                  <div className="forge-slot-steppers">
                    <div className="field-group">
                      <label htmlFor={`${baseId}-slot-max-${level}`}>
                        Maximum
                      </label>
                      <NumberStepper
                        id={`${baseId}-slot-max-${level}`}
                        name={`slot-max-${level}`}
                        value={slot.max}
                        min={0}
                        max={9}
                        decrementLabel={`Diminuer max niveau ${level}`}
                        incrementLabel={`Augmenter max niveau ${level}`}
                        onChange={(nextMax) => {
                          const cleanMax = Math.max(0, Math.trunc(nextMax));
                          onMutate((draft) => {
                            const target = draft.spellcasting?.slots[level];
                            if (target) {
                              target.max = cleanMax;
                              if (target.used > cleanMax) {
                                target.used = cleanMax;
                              }
                            }
                          });
                        }}
                      />
                    </div>

                    <div className="field-group">
                      <label htmlFor={`${baseId}-slot-used-${level}`}>
                        Utilisés
                      </label>
                      <NumberStepper
                        id={`${baseId}-slot-used-${level}`}
                        name={`slot-used-${level}`}
                        value={slot.used}
                        min={0}
                        max={slot.max}
                        decrementLabel={`Diminuer utilisés niveau ${level}`}
                        incrementLabel={`Augmenter utilisés niveau ${level}`}
                        onChange={(nextUsed) => {
                          onMutate((draft) => {
                            const target = draft.spellcasting?.slots[level];
                            if (target) {
                              target.used = Math.max(
                                0,
                                Math.min(Math.trunc(nextUsed), target.max),
                              );
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {availableSlotLevels.length > 0 && (
          <div className="forge-preset-strip" role="group" aria-label="Ajouter un niveau d'emplacement">
            {availableSlotLevels.map((lvl) => (
              <button
                key={lvl}
                type="button"
                className="action-btn"
                onClick={() =>
                  onMutate((draft) => {
                    if (draft.spellcasting) {
                      draft.spellcasting.slots[lvl] = { max: 2, used: 0 };
                    }
                  })
                }
              >
                + Niv. {lvl}
              </button>
            ))}
          </div>
        )}
      </fieldset>

      {/* Sous-bloc 3 : Magie de Pacte (Repos Court) */}
      <fieldset className="forge-fieldset">
        <legend>Magie de Pacte (Repos Court)</legend>
        {!spellcasting.pactSlots ? (
          <div className="forge-card-header">
            <span className="muted-caption">
              Emplacements spéciaux récupérés en Repos Court (ex. Occultiste / Sorcier).
            </span>
            <button
              type="button"
              className="action-btn"
              onClick={() =>
                onMutate((draft) => {
                  if (draft.spellcasting) {
                    draft.spellcasting.pactSlots = {
                      level: 1,
                      max: 1,
                      used: 0,
                    };
                  }
                })
              }
            >
              + Activer la Magie de Pacte
            </button>
          </div>
        ) : (
          <div className="forge-stack">
            <div className="forge-three-cols">
              <div className="field-group">
                <label htmlFor={`${baseId}-pact-lvl`}>
                  Niveau des emplacements
                </label>
                <NumberStepper
                  id={`${baseId}-pact-lvl`}
                  name="pactLevel"
                  value={spellcasting.pactSlots.level}
                  min={1}
                  max={5}
                  decrementLabel="Diminuer le niveau de pacte"
                  incrementLabel="Augmenter le niveau de pacte"
                  onChange={(nextLvl) =>
                    onMutate((draft) => {
                      if (draft.spellcasting?.pactSlots) {
                        draft.spellcasting.pactSlots.level = Math.min(
                          5,
                          Math.max(1, Math.trunc(nextLvl)),
                        );
                      }
                    })
                  }
                />
              </div>

              <div className="field-group">
                <label htmlFor={`${baseId}-pact-max`}>Maximum</label>
                <NumberStepper
                  id={`${baseId}-pact-max`}
                  name="pactMax"
                  value={spellcasting.pactSlots.max}
                  min={1}
                  max={6}
                  decrementLabel="Diminuer le maximum d'emplacements de pacte"
                  incrementLabel="Augmenter le maximum d'emplacements de pacte"
                  onChange={(nextMax) => {
                    const cleanMax = Math.max(1, Math.trunc(nextMax));
                    onMutate((draft) => {
                      const pact = draft.spellcasting?.pactSlots;
                      if (pact) {
                        pact.max = cleanMax;
                        if (pact.used > cleanMax) {
                          pact.used = cleanMax;
                        }
                      }
                    });
                  }}
                />
              </div>

              <div className="field-group">
                <label htmlFor={`${baseId}-pact-used`}>Utilisés</label>
                <NumberStepper
                  id={`${baseId}-pact-used`}
                  name="pactUsed"
                  value={spellcasting.pactSlots.used}
                  min={0}
                  max={spellcasting.pactSlots.max}
                  decrementLabel="Diminuer les emplacements de pacte utilisés"
                  incrementLabel="Augmenter les emplacements de pacte utilisés"
                  onChange={(nextUsed) =>
                    onMutate((draft) => {
                      const pact = draft.spellcasting?.pactSlots;
                      if (pact) {
                        pact.used = Math.max(
                          0,
                          Math.min(Math.trunc(nextUsed), pact.max),
                        );
                      }
                    })
                  }
                />
              </div>
            </div>

            <div className="forge-item-footer">
              <span className="muted-caption">
                Récupération complète à chaque Repos Court.
              </span>
              <button
                type="button"
                className="action-btn action-btn--danger"
                onClick={() =>
                  onMutate((draft) => {
                    if (draft.spellcasting) {
                      delete draft.spellcasting.pactSlots;
                    }
                  })
                }
              >
                Retirer la Magie de Pacte
              </button>
            </div>
          </div>
        )}
      </fieldset>

      {/* Sous-bloc 4 : Grimoire (Sorts & Capacités) */}
      <div className="forge-grimoire-block">
        <div className="forge-card-header">
          <div>
            <h3>Grimoire (Sorts & Capacités)</h3>
            <p className="muted-caption">
              Cochez « Préparé » directement ou ouvrez un sort pour modifier sa mécanique.
            </p>
          </div>
          <button
            type="button"
            className="action-btn action-btn--primary"
            onClick={handleAddSpell}
          >
            + Ajouter un sort
          </button>
        </div>

        <div className="forge-filter-bar">
          <div className="field-group">
            <label htmlFor={`${baseId}-spell-filter`}>Filtrer par niveau</label>
            <select
              id={`${baseId}-spell-filter`}
              name="spellLevelFilter"
              className="forge-select"
              value={levelFilter === 'all' ? 'all' : String(levelFilter)}
              onChange={(e) => {
                const raw = e.target.value;
                setLevelFilter(raw === 'all' ? 'all' : Number(raw));
              }}
            >
              <option value="all">
                Tous les niveaux ({spellcasting.abilitiesList.length})
              </option>
              {SPELL_LEVEL_OPTIONS.map((opt) => {
                const count = spellcasting.abilitiesList.filter(
                  (s) => s.level === opt.value,
                ).length;
                return (
                  <option key={opt.value} value={String(opt.value)}>
                    {opt.label} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {sortedSpells.length === 0 ? (
          <p className="muted-caption">
            Aucun sort dans cette sélection. Utilisez « + Ajouter un sort » pour enrichir le grimoire.
          </p>
        ) : (
          <div className="forge-repeat-list">
            {sortedSpells.map((spell) => {
              const isExpanded = expandedSpellIds.has(spell.id);
              const bodyId = `${baseId}-spell-body-${spell.id}`;
              const spellAbilityKey =
                spell.ability ?? spellcasting.defaultAbility;
              const spellStats = derived.spellcastingByAbility[spellAbilityKey];
              const levelMeta = SPELL_LEVEL_OPTIONS.find(
                (opt) => opt.value === spell.level,
              );
              const critMin = spell.critRangeMin ?? 20;

              return (
                <article
                  key={spell.id}
                  className={
                    spell.prepared
                      ? 'forge-entry-card forge-spell-card forge-spell-card--prepared'
                      : 'forge-entry-card forge-spell-card'
                  }
                >
                  <div className="forge-spell-bar">
                    <label
                      htmlFor={`${baseId}-spell-prep-${spell.id}`}
                      className={
                        spell.prepared
                          ? 'forge-prep-pill forge-prep-pill--active'
                          : 'forge-prep-pill'
                      }
                    >
                      <input
                        id={`${baseId}-spell-prep-${spell.id}`}
                        name={`spell-prep-${spell.id}`}
                        type="checkbox"
                        checked={spell.prepared}
                        onChange={(e) =>
                          mutateSpell(spell.id, (target) => {
                            target.prepared = e.target.checked;
                          })
                        }
                      />
                      <span>Préparé</span>
                    </label>

                    <button
                      type="button"
                      className="forge-disclosure-btn"
                      aria-expanded={isExpanded}
                      aria-controls={bodyId}
                      onClick={() => toggleSpellExpanded(spell.id)}
                    >
                      <span className="forge-entry-summary-main">
                        <span className="forge-entry-title">
                          <strong>{spell.name}</strong>
                          {spell.originalName && (
                            <span className="original-term">
                              ({spell.originalName})
                            </span>
                          )}
                        </span>
                        <span className="forge-entry-submeta">
                          {spell.castingTime || 'Action'} ·{' '}
                          {spell.range || 'Personnelle'}
                          {spell.hasAttackRoll && spellStats
                            ? ` · Toucher ${formatSignedModifier(spellStats.attackBonus)}`
                            : ''}
                          {spell.saveAbility && spellStats
                            ? ` · JS ${ABILITY_GLOSSARY[spell.saveAbility].abbrFr} DD ${spellStats.saveDC}`
                            : ''}
                          {spell.damageFormula
                            ? ` · ${spell.damageFormula}${spell.damageType ? ` (${spell.damageType})` : ''}`
                            : ''}
                        </span>
                      </span>

                      <span className="forge-entry-badges tabular-nums">
                        <span className="badge-pill">
                          {levelMeta?.shortLabel ?? `Niv. ${spell.level}`}
                        </span>
                      </span>
                    </button>
                  </div>

                  {isExpanded && (
                    <div id={bodyId} className="forge-entry-body">
                      <div className="forge-two-cols">
                        <div className="field-group">
                          <label htmlFor={`${baseId}-spell-name-${spell.id}`}>
                            Nom (FR) <span aria-hidden="true">*</span>
                          </label>
                          <CommittedTextInput
                            id={`${baseId}-spell-name-${spell.id}`}
                            name={`spell-name-${spell.id}`}
                            value={spell.name}
                            required
                            maxLength={80}
                            onCommit={(val) => {
                              const trimmed = val.trim();
                              if (!trimmed) return;
                              mutateSpell(spell.id, (target) => {
                                target.name = trimmed;
                              });
                            }}
                          />
                        </div>

                        <div className="field-group">
                          <label htmlFor={`${baseId}-spell-orig-${spell.id}`}>
                            Nom VO (optionnel)
                          </label>
                          <CommittedTextInput
                            id={`${baseId}-spell-orig-${spell.id}`}
                            name={`spell-orig-${spell.id}`}
                            value={spell.originalName ?? ''}
                            placeholder="ex. Fire Bolt"
                            maxLength={80}
                            onCommit={(val) => {
                              const trimmed = val.trim();
                              mutateSpell(spell.id, (target) => {
                                if (trimmed) {
                                  target.originalName = trimmed;
                                } else {
                                  delete target.originalName;
                                }
                              });
                            }}
                          />
                        </div>
                      </div>

                      <div className="forge-three-cols">
                        <div className="field-group">
                          <label htmlFor={`${baseId}-spell-lvl-${spell.id}`}>
                            Niveau
                          </label>
                          <select
                            id={`${baseId}-spell-lvl-${spell.id}`}
                            name={`spell-lvl-${spell.id}`}
                            className="forge-select"
                            value={String(spell.level)}
                            onChange={(e) => {
                              const nextLvl = Number(e.target.value);
                              mutateSpell(spell.id, (target) => {
                                target.level = nextLvl;
                              });
                            }}
                          >
                            {SPELL_LEVEL_OPTIONS.map((opt) => (
                              <option
                                key={opt.value}
                                value={String(opt.value)}
                              >
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="field-group">
                          <label htmlFor={`${baseId}-spell-cast-${spell.id}`}>
                            Temps d&apos;incantation
                          </label>
                          <CommittedTextInput
                            id={`${baseId}-spell-cast-${spell.id}`}
                            name={`spell-cast-${spell.id}`}
                            value={spell.castingTime}
                            placeholder="ex. Action, Action bonus, 1 min"
                            maxLength={50}
                            onCommit={(val) =>
                              mutateSpell(spell.id, (target) => {
                                target.castingTime = val.trim() || 'Action';
                              })
                            }
                          />
                        </div>

                        <div className="field-group">
                          <label htmlFor={`${baseId}-spell-range-${spell.id}`}>
                            Portée
                          </label>
                          <CommittedTextInput
                            id={`${baseId}-spell-range-${spell.id}`}
                            name={`spell-range-${spell.id}`}
                            value={spell.range}
                            placeholder="ex. 36 m, Personnelle, Contact"
                            maxLength={60}
                            onCommit={(val) =>
                              mutateSpell(spell.id, (target) => {
                                target.range = val.trim();
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="forge-three-cols">
                        <div className="field-group">
                          <label htmlFor={`${baseId}-spell-abil-${spell.id}`}>
                            Caractéristique
                          </label>
                          <select
                            id={`${baseId}-spell-abil-${spell.id}`}
                            name={`spell-abil-${spell.id}`}
                            className="forge-select"
                            value={spell.ability ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value;
                              mutateSpell(spell.id, (target) => {
                                if (raw) {
                                  target.ability = raw as AbilityKey;
                                } else {
                                  delete target.ability;
                                }
                              });
                            }}
                          >
                            <option value="">
                              Par défaut (
                              {ABILITY_GLOSSARY[spellcasting.defaultAbility].abbrFr}
                              )
                            </option>
                            {ABILITY_KEYS.map((key) => (
                              <option key={key} value={key}>
                                {ABILITY_GLOSSARY[key].abbrFr}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="field-group">
                          <label htmlFor={`${baseId}-spell-save-${spell.id}`}>
                            Jet de sauvegarde (cible)
                          </label>
                          <select
                            id={`${baseId}-spell-save-${spell.id}`}
                            name={`spell-save-${spell.id}`}
                            className="forge-select"
                            value={spell.saveAbility ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value;
                              mutateSpell(spell.id, (target) => {
                                if (raw) {
                                  target.saveAbility = raw as AbilityKey;
                                } else {
                                  delete target.saveAbility;
                                }
                              });
                            }}
                          >
                            <option value="">Aucun JdS</option>
                            {ABILITY_KEYS.map((key) => (
                              <option key={key} value={key}>
                                JS {ABILITY_GLOSSARY[key].abbrFr}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="field-group">
                          <span className="forge-field-spacer" aria-hidden="true">
                            Jet d&apos;attaque
                          </span>
                          <label
                            htmlFor={`${baseId}-spell-atk-${spell.id}`}
                            className={
                              spell.hasAttackRoll
                                ? 'forge-check-pill forge-check-pill--active'
                                : 'forge-check-pill'
                            }
                          >
                            <input
                              id={`${baseId}-spell-atk-${spell.id}`}
                              name={`spell-atk-${spell.id}`}
                              type="checkbox"
                              checked={Boolean(spell.hasAttackRoll)}
                              onChange={(e) =>
                                mutateSpell(spell.id, (target) => {
                                  if (e.target.checked) {
                                    target.hasAttackRoll = true;
                                  } else {
                                    delete target.hasAttackRoll;
                                    delete target.critRangeMin;
                                  }
                                })
                              }
                            />
                            <span>Attaque de sort</span>
                          </label>
                        </div>
                      </div>

                      <div className="forge-three-cols">
                        <div className="field-group">
                          <label htmlFor={`${baseId}-spell-dmg-${spell.id}`}>
                            Formule dégâts / soins
                          </label>
                          <CommittedTextInput
                            id={`${baseId}-spell-dmg-${spell.id}`}
                            name={`spell-dmg-${spell.id}`}
                            value={spell.damageFormula ?? ''}
                            placeholder="ex. 2d10 ou 1d8 + 4"
                            maxLength={40}
                            onCommit={(val) => {
                              const trimmed = val.trim();
                              mutateSpell(spell.id, (target) => {
                                if (trimmed) {
                                  target.damageFormula = trimmed;
                                } else {
                                  delete target.damageFormula;
                                }
                              });
                            }}
                          />
                        </div>

                        <div className="field-group">
                          <label htmlFor={`${baseId}-spell-type-${spell.id}`}>
                            Type (dégâts ou soins)
                          </label>
                          <CommittedTextInput
                            id={`${baseId}-spell-type-${spell.id}`}
                            name={`spell-type-${spell.id}`}
                            value={spell.damageType ?? ''}
                            placeholder="ex. Feu, Soin, Force"
                            maxLength={40}
                            onCommit={(val) => {
                              const trimmed = val.trim();
                              mutateSpell(spell.id, (target) => {
                                if (trimmed) {
                                  target.damageType = trimmed;
                                } else {
                                  delete target.damageType;
                                }
                              });
                            }}
                          />
                        </div>

                        {spell.hasAttackRoll && (
                          <div className="field-group">
                            <label htmlFor={`${baseId}-spell-crit-${spell.id}`}>
                              Seuil critique (d20)
                            </label>
                            <NumberStepper
                              id={`${baseId}-spell-crit-${spell.id}`}
                              name={`spell-crit-${spell.id}`}
                              value={critMin}
                              min={1}
                              max={20}
                              decrementLabel={`Réduire le seuil critique de ${spell.name}`}
                              incrementLabel={`Augmenter le seuil critique de ${spell.name}`}
                              onChange={(nextCrit) => {
                                const clamped = Math.min(
                                  20,
                                  Math.max(1, Math.trunc(nextCrit)),
                                );
                                mutateSpell(spell.id, (target) => {
                                  if (clamped === 20) {
                                    delete target.critRangeMin;
                                  } else {
                                    target.critRangeMin = clamped;
                                  }
                                });
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="field-group">
                        <label htmlFor={`${baseId}-spell-desc-${spell.id}`}>
                          Description / Effets en jeu
                        </label>
                        <CommittedTextArea
                          id={`${baseId}-spell-desc-${spell.id}`}
                          name={`spell-desc-${spell.id}`}
                          value={spell.description}
                          rows={3}
                          maxLength={500}
                          placeholder="Résumé mécanique, condition d'effet, durée, montée de niveau..."
                          onCommit={(val) =>
                            mutateSpell(spell.id, (target) => {
                              target.description = val.trim();
                            })
                          }
                        />
                      </div>

                      <div className="forge-item-footer">
                        <span className="muted-caption tabular-nums">
                          {spellStats
                            ? `Base ${ABILITY_GLOSSARY[spellAbilityKey].abbrFr} : DD ${spellStats.saveDC} · Toucher ${formatSignedModifier(spellStats.attackBonus)}`
                            : 'Aucune caractéristique active'}
                        </span>
                        <button
                          type="button"
                          className="action-btn action-btn--danger"
                          onClick={() => handleRemoveSpell(spell.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
