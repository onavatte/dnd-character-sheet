import { useId, useState } from 'react';
import type { Draft } from 'immer';
import {
  ABILITY_GLOSSARY,
  ABILITY_KEYS,
  formatSignedModifier,
} from '../../engine';
import type {
  AbilityKey,
  ActionTiming,
  AttackEntry,
  CharacterSheetV1,
  DerivedCharacterStats,
} from '../../engine';
import { ACTION_TIMING_OPTIONS } from './forge-constants';
import { CommittedTextInput, NumberStepper } from './ForgeSharedControls';

export interface ForgeAttacksSectionProps {
  sheet: CharacterSheetV1;
  derived: DerivedCharacterStats;
  onMutate: (recipe: (draft: Draft<CharacterSheetV1>) => void) => void;
}

/**
 * Éditeur des armes et attaques personnalisées (avec aperçu du toucher et liaison munitions).
 */
export function ForgeAttacksSection({
  sheet,
  derived,
  onMutate,
}: ForgeAttacksSectionProps) {
  const baseId = useId();
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const mutateAttack = (
    attackId: string,
    recipe: (target: Draft<AttackEntry>) => void,
  ) => {
    onMutate((draft) => {
      const target = draft.attacks.find((a) => a.id === attackId);
      if (target) {
        recipe(target);
      }
    });
  };

  const handleAddAttack = () => {
    const newId = `atk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    onMutate((draft) => {
      draft.attacks.push({
        id: newId,
        name: 'Nouvelle arme',
        ability: 'STR',
        proficient: true,
        attackBonusFlat: 0,
        damageFormula: '1d8',
        damageType: 'Tranchant',
        range: '1,5 m',
        actionTiming: 'action',
        notes: '',
      });
    });
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(newId);
      return next;
    });
  };

  const handleRemoveAttack = (attackId: string) => {
    onMutate((draft) => {
      draft.attacks = draft.attacks.filter((a) => a.id !== attackId);
    });
    setExpandedIds((prev) => {
      if (!prev.has(attackId)) return prev;
      const next = new Set(prev);
      next.delete(attackId);
      return next;
    });
  };

  const setExpanded = (attackId: string, isOpen: boolean) => {
    setExpandedIds((prev) => {
      if (prev.has(attackId) === isOpen) return prev;
      const next = new Set(prev);
      if (isOpen) {
        next.add(attackId);
      } else {
        next.delete(attackId);
      }
      return next;
    });
  };

  return (
    <section
      className="grimoire-card forge-card"
      aria-labelledby={`${baseId}-attacks-title`}
    >
      <div className="forge-card-header">
        <div>
          <h2 id={`${baseId}-attacks-title`} className="panel-title">
            Armes & Attaques
          </h2>
          <p className="muted-caption">
            Armes de mêlée, à distance et attaques spéciales.
          </p>
        </div>
        <button
          type="button"
          className="action-btn action-btn--primary"
          onClick={handleAddAttack}
        >
          + Ajouter une arme
        </button>
      </div>

      {sheet.attacks.length === 0 ? (
        <p className="muted-caption">
          Aucune arme ou attaque configurée. Utilisez « + Ajouter une arme » pour en créer une.
        </p>
      ) : (
        <div className="forge-repeat-list">
          {sheet.attacks.map((attack) => {
            const derivedAtk = derived.attacks.find((a) => a.id === attack.id);
            const toHitBonus = derivedAtk?.toHitBonus ?? 0;
            const critMin = derivedAtk?.critRangeMin ?? 20;
            const linkedAmmo = attack.ammoResourceId
              ? sheet.resources.find((r) => r.id === attack.ammoResourceId)
              : undefined;

            return (
              <article key={attack.id} className="forge-entry-card">
                <details
                  className="forge-entry-details"
                  open={expandedIds.has(attack.id)}
                  onToggle={(e) => setExpanded(attack.id, e.currentTarget.open)}
                >
                  <summary className="forge-entry-summary">
                    <span className="forge-entry-summary-main">
                      <span className="forge-entry-title">
                        <strong>{attack.name}</strong>
                        {attack.originalName && (
                          <span className="original-term">
                            ({attack.originalName})
                          </span>
                        )}
                      </span>
                      <span className="forge-entry-submeta">
                        {attack.range || 'Allonge 1,5 m'} ·{' '}
                        {attack.damageType || 'Dégâts'}
                        {critMin < 20 ? ` · Crit. ${critMin}-20` : ''}
                        {linkedAmmo ? ` · Mun. : ${linkedAmmo.name}` : ''}
                      </span>
                    </span>

                    <span className="forge-entry-badges tabular-nums">
                      <span className="badge-pill badge-pill--active">
                        1d20 {formatSignedModifier(toHitBonus)}
                      </span>
                      <span className="badge-pill">
                        {attack.damageFormula || '-'}
                      </span>
                    </span>
                  </summary>

                  <div className="forge-entry-body">
                    <div className="forge-two-cols">
                      <div className="field-group">
                        <label htmlFor={`${baseId}-atk-name-${attack.id}`}>
                          Nom (FR) <span aria-hidden="true">*</span>
                        </label>
                        <CommittedTextInput
                          id={`${baseId}-atk-name-${attack.id}`}
                          name={`atk-name-${attack.id}`}
                          value={attack.name}
                          required
                          maxLength={60}
                          onCommit={(val) => {
                            const trimmed = val.trim();
                            if (!trimmed) return;
                            mutateAttack(attack.id, (target) => {
                              target.name = trimmed;
                            });
                          }}
                        />
                      </div>

                      <div className="field-group">
                        <label htmlFor={`${baseId}-atk-orig-${attack.id}`}>
                          Nom VO (optionnel)
                        </label>
                        <CommittedTextInput
                          id={`${baseId}-atk-orig-${attack.id}`}
                          name={`atk-orig-${attack.id}`}
                          value={attack.originalName ?? ''}
                          placeholder="ex. Longsword"
                          maxLength={60}
                          onCommit={(val) => {
                            const trimmed = val.trim();
                            mutateAttack(attack.id, (target) => {
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
                        <label htmlFor={`${baseId}-atk-abil-${attack.id}`}>
                          Caractéristique
                        </label>
                        <select
                          id={`${baseId}-atk-abil-${attack.id}`}
                          name={`atk-abil-${attack.id}`}
                          className="forge-select"
                          value={attack.ability}
                          onChange={(e) => {
                            const nextAbil = e.target.value as AbilityKey;
                            mutateAttack(attack.id, (target) => {
                              target.ability = nextAbil;
                            });
                          }}
                        >
                          {ABILITY_KEYS.map((key) => (
                            <option key={key} value={key}>
                              {ABILITY_GLOSSARY[key].abbrFr} (
                              {formatSignedModifier(
                                derived.abilityModifiers[key],
                              )}
                              )
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="field-group">
                        <label htmlFor={`${baseId}-atk-flat-${attack.id}`}>
                          Bonus toucher divers
                        </label>
                        <NumberStepper
                          id={`${baseId}-atk-flat-${attack.id}`}
                          name={`atk-flat-${attack.id}`}
                          value={attack.attackBonusFlat}
                          min={-10}
                          max={20}
                          decrementLabel={`Diminuer le bonus d'attaque de ${attack.name}`}
                          incrementLabel={`Augmenter le bonus d'attaque de ${attack.name}`}
                          onChange={(nextVal) =>
                            mutateAttack(attack.id, (target) => {
                              target.attackBonusFlat = Math.trunc(nextVal);
                            })
                          }
                        />
                      </div>

                      <div className="field-group">
                        <span className="forge-field-spacer" aria-hidden="true">
                          Maîtrise
                        </span>
                        <label
                          htmlFor={`${baseId}-atk-prof-${attack.id}`}
                          className={
                            attack.proficient
                              ? 'forge-check-pill forge-check-pill--active'
                              : 'forge-check-pill'
                          }
                        >
                          <input
                            id={`${baseId}-atk-prof-${attack.id}`}
                            name={`atk-prof-${attack.id}`}
                            type="checkbox"
                            checked={attack.proficient}
                            onChange={(e) =>
                              mutateAttack(attack.id, (target) => {
                                target.proficient = e.target.checked;
                              })
                            }
                          />
                          <span>
                            Maîtrise (+{derived.proficiencyBonus})
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="forge-three-cols">
                      <div className="field-group">
                        <label htmlFor={`${baseId}-atk-dmg-${attack.id}`}>
                          Formule de dégâts <span aria-hidden="true">*</span>
                        </label>
                        <CommittedTextInput
                          id={`${baseId}-atk-dmg-${attack.id}`}
                          name={`atk-dmg-${attack.id}`}
                          value={attack.damageFormula}
                          placeholder="ex. 1d8 + 3"
                          required
                          maxLength={40}
                          onCommit={(val) => {
                            const trimmed = val.trim();
                            if (!trimmed) return;
                            mutateAttack(attack.id, (target) => {
                              target.damageFormula = trimmed;
                            });
                          }}
                        />
                      </div>

                      <div className="field-group">
                        <label htmlFor={`${baseId}-atk-type-${attack.id}`}>
                          Type de dégâts
                        </label>
                        <CommittedTextInput
                          id={`${baseId}-atk-type-${attack.id}`}
                          name={`atk-type-${attack.id}`}
                          value={attack.damageType}
                          placeholder="ex. Tranchant"
                          maxLength={40}
                          onCommit={(val) =>
                            mutateAttack(attack.id, (target) => {
                              target.damageType = val.trim();
                            })
                          }
                        />
                      </div>

                      <div className="field-group">
                        <label htmlFor={`${baseId}-atk-range-${attack.id}`}>
                          Portée
                        </label>
                        <CommittedTextInput
                          id={`${baseId}-atk-range-${attack.id}`}
                          name={`atk-range-${attack.id}`}
                          value={attack.range}
                          placeholder="ex. 1,5 m ou 24/96 m"
                          maxLength={60}
                          onCommit={(val) =>
                            mutateAttack(attack.id, (target) => {
                              target.range = val.trim();
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="forge-three-cols">
                      <div className="field-group">
                        <label htmlFor={`${baseId}-atk-time-${attack.id}`}>
                          Type d&apos;action
                        </label>
                        <select
                          id={`${baseId}-atk-time-${attack.id}`}
                          name={`atk-time-${attack.id}`}
                          className="forge-select"
                          value={attack.actionTiming ?? 'action'}
                          onChange={(e) => {
                            const nextTiming = e.target.value as ActionTiming;
                            mutateAttack(attack.id, (target) => {
                              target.actionTiming = nextTiming;
                            });
                          }}
                        >
                          {ACTION_TIMING_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="field-group">
                        <label htmlFor={`${baseId}-atk-crit-${attack.id}`}>
                          Seuil critique (d20)
                        </label>
                        <NumberStepper
                          id={`${baseId}-atk-crit-${attack.id}`}
                          name={`atk-crit-${attack.id}`}
                          value={critMin}
                          min={1}
                          max={20}
                          decrementLabel={`Réduire le seuil critique de ${attack.name}`}
                          incrementLabel={`Augmenter le seuil critique de ${attack.name}`}
                          onChange={(nextCrit) => {
                            const clamped = Math.min(
                              20,
                              Math.max(1, Math.trunc(nextCrit)),
                            );
                            mutateAttack(attack.id, (target) => {
                              if (clamped === 20) {
                                delete target.critRangeMin;
                              } else {
                                target.critRangeMin = clamped;
                              }
                            });
                          }}
                        />
                      </div>

                      <div className="field-group">
                        <label htmlFor={`${baseId}-atk-ammo-${attack.id}`}>
                          Munitions liées
                        </label>
                        <select
                          id={`${baseId}-atk-ammo-${attack.id}`}
                          name={`atk-ammo-${attack.id}`}
                          className="forge-select"
                          value={attack.ammoResourceId ?? ''}
                          onChange={(e) => {
                            const nextAmmoId = e.target.value;
                            mutateAttack(attack.id, (target) => {
                              if (nextAmmoId) {
                                target.ammoResourceId = nextAmmoId;
                              } else {
                                delete target.ammoResourceId;
                              }
                            });
                          }}
                        >
                          <option value="">Aucune munition</option>
                          {sheet.resources.map((res) => (
                            <option key={res.id} value={res.id}>
                              {res.name} ({res.current}/{res.max})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="field-group">
                      <label htmlFor={`${baseId}-atk-notes-${attack.id}`}>
                        Notes (propriétés, effets)
                      </label>
                      <CommittedTextInput
                        id={`${baseId}-atk-notes-${attack.id}`}
                        name={`atk-notes-${attack.id}`}
                        value={attack.notes}
                        placeholder="ex. Finesse, légère, polyvalente (1d10)"
                        maxLength={140}
                        onCommit={(val) =>
                          mutateAttack(attack.id, (target) => {
                            target.notes = val.trim();
                          })
                        }
                      />
                    </div>

                    <div className="forge-item-footer">
                      <span className="muted-caption tabular-nums">
                        Toucher calculé : 1d20 {formatSignedModifier(toHitBonus)}{' '}
                        · Crit. {critMin === 20 ? '20' : `${critMin}-20`}
                      </span>
                      <button
                        type="button"
                        className="action-btn action-btn--danger"
                        onClick={() => handleRemoveAttack(attack.id)}
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
