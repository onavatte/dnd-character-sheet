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
  RecoveryTiming,
  ResourceCategory,
  TrackedResource,
} from '../../engine';
import {
  getResourceCategoryLabel,
  RECOVERY_OPTIONS,
  RESOURCE_CATEGORY_OPTIONS,
} from './forge-constants';
import {
  CommittedTextArea,
  CommittedTextInput,
  NumberStepper,
} from './ForgeSharedControls';

export interface ForgeResourcesSectionProps {
  sheet: CharacterSheetV1;
  derived: DerivedCharacterStats;
  onMutate: (recipe: (draft: Draft<CharacterSheetV1>) => void) => void;
}

/**
 * Éditeur des ressources suivies (capacités comptées, objets magiques à charges, munitions).
 */
export function ForgeResourcesSection({
  sheet,
  derived,
  onMutate,
}: ForgeResourcesSectionProps) {
  const baseId = useId();
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const mutateResource = (
    resourceId: string,
    updater: (target: Draft<TrackedResource>) => void,
  ) => {
    onMutate((draft) => {
      const target = draft.resources.find((r) => r.id === resourceId);
      if (target) {
        updater(target);
      }
    });
  };

  const handleAddResource = () => {
    const newId = `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    onMutate((draft) => {
      draft.resources.push({
        id: newId,
        name: 'Nouvelle réserve',
        current: 1,
        max: 1,
        recovery: 'short_rest',
      });
    });
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(newId);
      return next;
    });
  };

  const handleRemoveResource = (resourceId: string) => {
    onMutate((draft) => {
      draft.resources = draft.resources.filter((res) => res.id !== resourceId);
      for (const atk of draft.attacks) {
        if (atk.ammoResourceId === resourceId) {
          delete atk.ammoResourceId;
        }
      }
    });
    setExpandedIds((prev) => {
      if (!prev.has(resourceId)) return prev;
      const next = new Set(prev);
      next.delete(resourceId);
      return next;
    });
  };

  const setExpanded = (resourceId: string, isOpen: boolean) => {
    setExpandedIds((prev) => {
      if (prev.has(resourceId) === isOpen) return prev;
      const next = new Set(prev);
      if (isOpen) {
        next.add(resourceId);
      } else {
        next.delete(resourceId);
      }
      return next;
    });
  };

  return (
    <section
      className="grimoire-card forge-card"
      aria-labelledby={`${baseId}-resources-title`}
    >
      <div className="forge-card-header">
        <div>
          <h2 id={`${baseId}-resources-title`} className="panel-title">
            Réserves & Charges
          </h2>
          <p className="muted-caption">
            Capacités comptées, objets magiques à charges ou munitions.
          </p>
        </div>
        <button
          type="button"
          className="action-btn action-btn--primary"
          onClick={handleAddResource}
        >
          + Ajouter une réserve
        </button>
      </div>

      {sheet.resources.length === 0 ? (
        <p className="muted-caption">
          Aucune réserve ou charge suivie pour le moment. Utilisez « + Ajouter une réserve » pour en créer une.
        </p>
      ) : (
        <div className="forge-repeat-list">
          {sheet.resources.map((resource) => {
            const recoveryLabel =
              RECOVERY_OPTIONS.find((opt) => opt.value === resource.recovery)
                ?.label ?? 'Manuel';
            const abilityStats = resource.ability
              ? derived.spellcastingByAbility[resource.ability]
              : undefined;
            const effectiveDC = resource.fixedSaveDC ?? abilityStats?.saveDC;
            const critMin = resource.critRangeMin ?? 20;
            const hasMechanicalSummary = Boolean(
              resource.hasAttackRoll ||
                resource.saveAbility ||
                resource.fixedSaveDC ||
                resource.damageFormula,
            );
            const submetaParts = [
              `Récup. : ${recoveryLabel}`,
              ...(resource.castingTime ? [resource.castingTime] : []),
              ...(resource.range ? [resource.range] : []),
              ...(resource.saveAbility
                ? [
                    `JS ${ABILITY_GLOSSARY[resource.saveAbility].abbrFr}${
                      effectiveDC !== undefined ? ` DD ${effectiveDC}` : ''
                    }`,
                  ]
                : []),
            ];

            return (
              <article key={resource.id} className="forge-entry-card">
                <details
                  className="forge-entry-details"
                  open={expandedIds.has(resource.id)}
                  onToggle={(e) =>
                    setExpanded(resource.id, e.currentTarget.open)
                  }
                >
                  <summary className="forge-entry-summary">
                    <span className="forge-entry-summary-main">
                      <span className="forge-entry-title">
                        <strong>{resource.name}</strong>
                        {resource.originalName && (
                          <span className="original-term">
                            ({resource.originalName})
                          </span>
                        )}
                      </span>
                      <span className="forge-entry-submeta">
                        {submetaParts.join(' · ')}
                      </span>
                    </span>

                    <span className="forge-entry-badges tabular-nums">
                      {resource.category && (
                        <span className="badge-pill">
                          {getResourceCategoryLabel(resource.category)}
                        </span>
                      )}
                      <span className="badge-pill badge-pill--active">
                        {resource.current} / {resource.max}
                      </span>
                    </span>
                  </summary>

                  <div className="forge-entry-body">
                    <div className="forge-two-cols">
                      <div className="field-group">
                        <label htmlFor={`${baseId}-res-name-${resource.id}`}>
                          Nom (FR) <span aria-hidden="true">*</span>
                        </label>
                        <CommittedTextInput
                          id={`${baseId}-res-name-${resource.id}`}
                          name={`res-name-${resource.id}`}
                          value={resource.name}
                          required
                          maxLength={60}
                          onCommit={(nextVal) => {
                            const trimmed = nextVal.trim();
                            if (!trimmed) return;
                            mutateResource(resource.id, (target) => {
                              target.name = trimmed;
                            });
                          }}
                        />
                      </div>

                      <div className="field-group">
                        <label htmlFor={`${baseId}-res-orig-${resource.id}`}>
                          Nom VO (optionnel)
                        </label>
                        <CommittedTextInput
                          id={`${baseId}-res-orig-${resource.id}`}
                          name={`res-orig-${resource.id}`}
                          value={resource.originalName ?? ''}
                          placeholder="ex. Action Surge"
                          maxLength={60}
                          onCommit={(nextVal) => {
                            const trimmed = nextVal.trim();
                            mutateResource(resource.id, (target) => {
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
                        <label htmlFor={`${baseId}-res-curr-${resource.id}`}>
                          Actuel
                        </label>
                        <NumberStepper
                          id={`${baseId}-res-curr-${resource.id}`}
                          name={`res-curr-${resource.id}`}
                          value={resource.current}
                          min={0}
                          max={resource.max}
                          decrementLabel={`Diminuer ${resource.name}`}
                          incrementLabel={`Augmenter ${resource.name}`}
                          onChange={(nextVal) => {
                            mutateResource(resource.id, (target) => {
                              target.current = Math.max(
                                0,
                                Math.min(nextVal, target.max),
                              );
                            });
                          }}
                        />
                      </div>

                      <div className="field-group">
                        <label htmlFor={`${baseId}-res-max-${resource.id}`}>
                          Maximum
                        </label>
                        <NumberStepper
                          id={`${baseId}-res-max-${resource.id}`}
                          name={`res-max-${resource.id}`}
                          value={resource.max}
                          min={0}
                          max={99}
                          decrementLabel={`Diminuer le maximum de ${resource.name}`}
                          incrementLabel={`Augmenter le maximum de ${resource.name}`}
                          onChange={(nextVal) => {
                            mutateResource(resource.id, (target) => {
                              target.max = Math.max(0, nextVal);
                              if (target.current > target.max) {
                                target.current = target.max;
                              }
                            });
                          }}
                        />
                      </div>

                      <div className="field-group">
                        <label htmlFor={`${baseId}-res-rec-${resource.id}`}>
                          Récupération
                        </label>
                        <select
                          id={`${baseId}-res-rec-${resource.id}`}
                          name={`res-rec-${resource.id}`}
                          className="forge-select"
                          value={resource.recovery}
                          onChange={(e) => {
                            const nextRecovery = e.target.value as RecoveryTiming;
                            mutateResource(resource.id, (target) => {
                              target.recovery = nextRecovery;
                            });
                          }}
                        >
                          {RECOVERY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="forge-three-cols">
                      <div className="field-group">
                        <label htmlFor={`${baseId}-res-cat-${resource.id}`}>
                          Catégorie (optionnel)
                        </label>
                        <select
                          id={`${baseId}-res-cat-${resource.id}`}
                          name={`res-cat-${resource.id}`}
                          className="forge-select"
                          value={resource.category ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            mutateResource(resource.id, (target) => {
                              if (raw) {
                                target.category = raw as ResourceCategory;
                              } else {
                                delete target.category;
                              }
                            });
                          }}
                        >
                          <option value="">Standard (sans badge)</option>
                          {RESOURCE_CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="field-group">
                        <label htmlFor={`${baseId}-res-cast-${resource.id}`}>
                          Activation (optionnel)
                        </label>
                        <CommittedTextInput
                          id={`${baseId}-res-cast-${resource.id}`}
                          name={`res-cast-${resource.id}`}
                          value={resource.castingTime ?? ''}
                          placeholder="ex. 1 action, Action bonus"
                          maxLength={50}
                          onCommit={(val) => {
                            const trimmed = val.trim();
                            mutateResource(resource.id, (target) => {
                              if (trimmed) {
                                target.castingTime = trimmed;
                              } else {
                                delete target.castingTime;
                              }
                            });
                          }}
                        />
                      </div>

                      <div className="field-group">
                        <label htmlFor={`${baseId}-res-range-${resource.id}`}>
                          Portée (optionnel)
                        </label>
                        <CommittedTextInput
                          id={`${baseId}-res-range-${resource.id}`}
                          name={`res-range-${resource.id}`}
                          value={resource.range ?? ''}
                          placeholder="ex. 30 ft, 9 m, Toucher"
                          maxLength={60}
                          onCommit={(val) => {
                            const trimmed = val.trim();
                            mutateResource(resource.id, (target) => {
                              if (trimmed) {
                                target.range = trimmed;
                              } else {
                                delete target.range;
                              }
                            });
                          }}
                        />
                      </div>
                    </div>

                    <div className="field-group">
                      <label htmlFor={`${baseId}-res-desc-${resource.id}`}>
                        Effet / Description (optionnel)
                      </label>
                      <CommittedTextArea
                        id={`${baseId}-res-desc-${resource.id}`}
                        name={`res-desc-${resource.id}`}
                        value={resource.description ?? ''}
                        rows={2}
                        maxLength={500}
                        placeholder="Ex. Cône de 4,5 m ; chaque créature effectue un JdS DEX (moitié des dégâts en cas de réussite)."
                        onCommit={(val) => {
                          const trimmed = val.trim();
                          mutateResource(resource.id, (target) => {
                            if (trimmed) {
                              target.description = trimmed;
                            } else {
                              delete target.description;
                            }
                          });
                        }}
                      />
                    </div>

                    <details
                      className="forge-nested-details"
                      open={hasMechanicalSummary}
                    >
                      <summary className="forge-nested-summary">
                        <span>Résolution mécanique & jets (optionnel)</span>
                        {hasMechanicalSummary && (
                          <span className="muted-caption tabular-nums">
                            {[
                              resource.hasAttackRoll && abilityStats
                                ? `Toucher ${formatSignedModifier(abilityStats.attackBonus)}`
                                : resource.hasAttackRoll
                                  ? 'Attaque 1d20'
                                  : null,
                              resource.saveAbility
                                ? `JS ${ABILITY_GLOSSARY[resource.saveAbility].abbrFr}${
                                    effectiveDC !== undefined
                                      ? ` DD ${effectiveDC}`
                                      : ''
                                  }`
                                : null,
                              resource.damageFormula
                                ? `${resource.damageFormula}${
                                    resource.damageType
                                      ? ` (${resource.damageType})`
                                      : ''
                                  }`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        )}
                      </summary>

                      <div className="forge-nested-body">
                        <div className="forge-three-cols">
                          <div className="field-group">
                            <label htmlFor={`${baseId}-res-abil-${resource.id}`}>
                              Caractéristique (DD / Toucher)
                            </label>
                            <select
                              id={`${baseId}-res-abil-${resource.id}`}
                              name={`res-abil-${resource.id}`}
                              className="forge-select"
                              value={resource.ability ?? ''}
                              onChange={(e) => {
                                const raw = e.target.value;
                                mutateResource(resource.id, (target) => {
                                  if (raw) {
                                    target.ability = raw as AbilityKey;
                                  } else {
                                    delete target.ability;
                                  }
                                });
                              }}
                            >
                              <option value="">Aucune</option>
                              {ABILITY_KEYS.map((key) => (
                                <option key={key} value={key}>
                                  {ABILITY_GLOSSARY[key].abbrFr} (DD{' '}
                                  {derived.spellcastingByAbility[key]?.saveDC ??
                                    '-'}
                                  )
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="field-group">
                            <label htmlFor={`${baseId}-res-save-${resource.id}`}>
                              Jet de sauvegarde (cible)
                            </label>
                            <select
                              id={`${baseId}-res-save-${resource.id}`}
                              name={`res-save-${resource.id}`}
                              className="forge-select"
                              value={resource.saveAbility ?? ''}
                              onChange={(e) => {
                                const raw = e.target.value;
                                mutateResource(resource.id, (target) => {
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
                            <label htmlFor={`${baseId}-res-dc-${resource.id}`}>
                              DD fixe (ex. objet magique)
                            </label>
                            <input
                              id={`${baseId}-res-dc-${resource.id}`}
                              name={`res-dc-${resource.id}`}
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={99}
                              className="forge-input tabular-nums"
                              value={resource.fixedSaveDC ?? ''}
                              placeholder={
                                abilityStats
                                  ? `Auto (${abilityStats.saveDC})`
                                  : 'Auto / ex. 13'
                              }
                              onChange={(e) => {
                                const raw = e.target.value.trim();
                                mutateResource(resource.id, (target) => {
                                  if (!raw) {
                                    delete target.fixedSaveDC;
                                    return;
                                  }
                                  const parsed = Number.parseInt(raw, 10);
                                  if (
                                    Number.isFinite(parsed) &&
                                    parsed >= 1 &&
                                    parsed <= 99
                                  ) {
                                    target.fixedSaveDC = parsed;
                                  }
                                });
                              }}
                            />
                          </div>
                        </div>

                        <div className="forge-three-cols">
                          <div className="field-group">
                            <span
                              className="forge-field-spacer"
                              aria-hidden="true"
                            >
                              Jet d&apos;attaque
                            </span>
                            <label
                              htmlFor={`${baseId}-res-atk-${resource.id}`}
                              className={
                                resource.hasAttackRoll
                                  ? 'forge-check-pill forge-check-pill--active'
                                  : 'forge-check-pill'
                              }
                            >
                              <input
                                id={`${baseId}-res-atk-${resource.id}`}
                                name={`res-atk-${resource.id}`}
                                type="checkbox"
                                checked={Boolean(resource.hasAttackRoll)}
                                onChange={(e) =>
                                  mutateResource(resource.id, (target) => {
                                    if (e.target.checked) {
                                      target.hasAttackRoll = true;
                                    } else {
                                      delete target.hasAttackRoll;
                                      delete target.critRangeMin;
                                    }
                                  })
                                }
                              />
                              <span>Jet d&apos;attaque (1d20)</span>
                            </label>
                          </div>

                          <div className="field-group">
                            <label htmlFor={`${baseId}-res-dmg-${resource.id}`}>
                              Formule dégâts / soins
                            </label>
                            <CommittedTextInput
                              id={`${baseId}-res-dmg-${resource.id}`}
                              name={`res-dmg-${resource.id}`}
                              value={resource.damageFormula ?? ''}
                              placeholder="ex. 8d6 ou 2d10 + 3"
                              maxLength={40}
                              onCommit={(val) => {
                                const trimmed = val.trim();
                                mutateResource(resource.id, (target) => {
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
                            <label htmlFor={`${baseId}-res-type-${resource.id}`}>
                              Type (dégâts ou soins)
                            </label>
                            <CommittedTextInput
                              id={`${baseId}-res-type-${resource.id}`}
                              name={`res-type-${resource.id}`}
                              value={resource.damageType ?? ''}
                              placeholder="ex. Feu, Foudre, Soin"
                              maxLength={40}
                              onCommit={(val) => {
                                const trimmed = val.trim();
                                mutateResource(resource.id, (target) => {
                                  if (trimmed) {
                                    target.damageType = trimmed;
                                  } else {
                                    delete target.damageType;
                                  }
                                });
                              }}
                            />
                          </div>
                        </div>

                        {resource.hasAttackRoll && (
                          <div className="forge-three-cols">
                            <div className="field-group">
                              <label
                                htmlFor={`${baseId}-res-crit-${resource.id}`}
                              >
                                Seuil critique (d20)
                              </label>
                              <NumberStepper
                                id={`${baseId}-res-crit-${resource.id}`}
                                name={`res-crit-${resource.id}`}
                                value={critMin}
                                min={1}
                                max={20}
                                decrementLabel={`Réduire le seuil critique de ${resource.name}`}
                                incrementLabel={`Augmenter le seuil critique de ${resource.name}`}
                                onChange={(nextCrit) => {
                                  const clamped = Math.min(
                                    20,
                                    Math.max(1, Math.trunc(nextCrit)),
                                  );
                                  mutateResource(resource.id, (target) => {
                                    if (clamped >= 20) {
                                      delete target.critRangeMin;
                                    } else {
                                      target.critRangeMin = clamped;
                                    }
                                  });
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </details>

                    <div className="forge-item-footer">
                      <span className="muted-caption tabular-nums">
                        {recoveryLabel} · {resource.current} / {resource.max}
                      </span>
                      <button
                        type="button"
                        className="action-btn action-btn--danger"
                        onClick={() => handleRemoveResource(resource.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
