import { useId, useState } from 'react';
import type { Draft } from 'immer';
import type { CharacterSheetV1, RecoveryTiming } from '../../engine';
import { RECOVERY_OPTIONS } from './forge-constants';
import { CommittedTextInput, NumberStepper } from './ForgeSharedControls';

export interface ForgeResourcesSectionProps {
  sheet: CharacterSheetV1;
  onMutate: (recipe: (draft: Draft<CharacterSheetV1>) => void) => void;
}

/**
 * Éditeur des ressources suivies (capacités à charges, munitions, points de classe).
 */
export function ForgeResourcesSection({
  sheet,
  onMutate,
}: ForgeResourcesSectionProps) {
  const baseId = useId();
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const handleAddResource = () => {
    const newId = `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    onMutate((draft) => {
      draft.resources.push({
        id: newId,
        name: 'Nouvelle ressource',
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
            Ressources suivies
          </h2>
          <p className="muted-caption">
            Capacités de classe, munitions ou charges.
          </p>
        </div>
        <button
          type="button"
          className="action-btn action-btn--primary"
          onClick={handleAddResource}
        >
          + Ajouter une ressource
        </button>
      </div>

      {sheet.resources.length === 0 ? (
        <p className="muted-caption">
          Aucune ressource suivie pour le moment. Utilisez « + Ajouter une ressource » pour en créer une.
        </p>
      ) : (
        <div className="forge-repeat-list">
          {sheet.resources.map((resource) => {
            const recoveryLabel =
              RECOVERY_OPTIONS.find((opt) => opt.value === resource.recovery)
                ?.label ?? 'Manuel';

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
                        Récup. : {recoveryLabel}
                      </span>
                    </span>

                    <span className="forge-entry-badges tabular-nums">
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
                            onMutate((draft) => {
                              const target = draft.resources.find(
                                (r) => r.id === resource.id,
                              );
                              if (target) {
                                target.name = trimmed;
                              }
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
                            onMutate((draft) => {
                              const target = draft.resources.find(
                                (r) => r.id === resource.id,
                              );
                              if (!target) return;
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
                            onMutate((draft) => {
                              const target = draft.resources.find(
                                (r) => r.id === resource.id,
                              );
                              if (target) {
                                target.current = Math.max(
                                  0,
                                  Math.min(nextVal, target.max),
                                );
                              }
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
                            onMutate((draft) => {
                              const target = draft.resources.find(
                                (r) => r.id === resource.id,
                              );
                              if (target) {
                                target.max = Math.max(0, nextVal);
                                if (target.current > target.max) {
                                  target.current = target.max;
                                }
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
                            onMutate((draft) => {
                              const target = draft.resources.find(
                                (r) => r.id === resource.id,
                              );
                              if (target) {
                                target.recovery = nextRecovery;
                              }
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
