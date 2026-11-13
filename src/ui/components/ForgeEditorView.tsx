import { useState } from 'react';
import type { Draft } from 'immer';
import type {
  CharacterSheetV1,
  DerivedCharacterStats,
  RecoveryTiming,
} from '../../engine/types';
import { RECOVERY_OPTIONS } from './forge-constants';
import { ForgeIdentityTab } from './ForgeIdentityTab';
import { CommittedTextInput, NumberStepper } from './ForgeSharedControls';
import { ForgeStatsAndSkillsTab } from './ForgeStatsAndSkillsTab';

export type ForgeTabId = 'identity' | 'stats' | 'combat' | 'inventory';

interface ForgeTabMeta {
  id: ForgeTabId;
  label: string;
}

const FORGE_TABS: readonly ForgeTabMeta[] = [
  { id: 'identity', label: '1. Identité & Classes' },
  { id: 'stats', label: '2. Stats & Compétences' },
  { id: 'combat', label: '3. Ressources, Armes & Sorts' },
  { id: 'inventory', label: '4. Inventaire & Notes' },
];

export interface ForgeEditorViewProps {
  sheet: CharacterSheetV1;
  derived: DerivedCharacterStats;
  onMutate: (recipe: (draft: Draft<CharacterSheetV1>) => void) => void;
}

export function ForgeEditorView({ sheet, derived, onMutate }: ForgeEditorViewProps) {
  const [activeTab, setActiveTab] = useState<ForgeTabId>('identity');

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
  };

  const handleRemoveResource = (resourceId: string) => {
    onMutate((draft) => {
      draft.resources = draft.resources.filter((res) => res.id !== resourceId);
    });
  };

  return (
    <main className="forge-shell" aria-label="Forge d'édition du personnage">
      <div className="forge-tabs-bar">
        <div
          className="forge-tabs"
          role="tablist"
          aria-label="Sections de la Forge d'édition"
        >
          {FORGE_TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`forge-tab-${tab.id}`}
                aria-selected={isSelected}
                aria-controls={`forge-panel-${tab.id}`}
                className={
                  isSelected
                    ? 'segmented-btn segmented-btn--active'
                    : 'segmented-btn'
                }
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'identity' && (
        <div
          role="tabpanel"
          id="forge-panel-identity"
          aria-labelledby="forge-tab-identity"
        >
          <ForgeIdentityTab sheet={sheet} derived={derived} onMutate={onMutate} />
        </div>
      )}

      {activeTab === 'stats' && (
        <div
          role="tabpanel"
          id="forge-panel-stats"
          aria-labelledby="forge-tab-stats"
        >
          <ForgeStatsAndSkillsTab
            sheet={sheet}
            derived={derived}
            onMutate={onMutate}
          />
        </div>
      )}

      {activeTab === 'combat' && (
        <div
          role="tabpanel"
          id="forge-panel-combat"
          aria-labelledby="forge-tab-combat"
          className="forge-grid"
        >
          <section className="grimoire-card forge-card">
            <div className="forge-card-header">
              <div>
                <h2 className="panel-title">Ressources suivies</h2>
                <p className="muted-caption">
                  Capacités de classe, munitions spéciales ou charges (Ki, Rage, Focalisation).
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
                Aucune ressource suivie pour le moment. Utilisez le bouton ci-dessus pour en créer une.
              </p>
            ) : (
              <div className="forge-repeat-list">
                {sheet.resources.map((resource) => (
                  <article key={resource.id} className="forge-item-card">
                    <div className="forge-two-cols">
                      <div className="field-group">
                        <label htmlFor={`res-name-${resource.id}`}>
                          Nom (FR)
                        </label>
                        <CommittedTextInput
                          id={`res-name-${resource.id}`}
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
                        <label htmlFor={`res-orig-${resource.id}`}>
                          Nom VO (optionnel)
                        </label>
                        <CommittedTextInput
                          id={`res-orig-${resource.id}`}
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
                        <label htmlFor={`res-curr-${resource.id}`}>
                          Actuel
                        </label>
                        <NumberStepper
                          id={`res-curr-${resource.id}`}
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
                        <label htmlFor={`res-max-${resource.id}`}>
                          Maximum
                        </label>
                        <NumberStepper
                          id={`res-max-${resource.id}`}
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
                        <label htmlFor={`res-rec-${resource.id}`}>
                          Récupération
                        </label>
                        <select
                          id={`res-rec-${resource.id}`}
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
                      <button
                        type="button"
                        className="action-btn action-btn--danger"
                        onClick={() => handleRemoveResource(resource.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="grimoire-card forge-card">
            <h2 className="panel-title">Armes, Attaques & Sorts</h2>
            <p className="muted-caption">
              L'éditeur d'armes et d'attaques personnalisées ainsi que la gestion des emplacements de sorts et du grimoire arriveront dans le Lot 4.3 de ce jalon.
            </p>
            <div className="roll-banner" role="status">
              <strong>Prochaine étape : Lot 4.3</strong>
              <span>
                En attendant, vos attaques, sorts préparés et emplacements restent immédiatement utilisables depuis le Cockpit de Partie.
              </span>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div
          role="tabpanel"
          id="forge-panel-inventory"
          aria-labelledby="forge-tab-inventory"
          className="forge-grid"
        >
          <section className="grimoire-card forge-card">
            <h2 className="panel-title">Inventaire, Monnaie & Notes</h2>
            <p className="muted-caption">
              L'édition structurée du butin (catégories, poids, quantité, équipements portés), des devises (po, pa, pc ou capsules/crédits) et des notes catégorisées arrivera dans les Lots 4.3 et 4.4.
            </p>
            <div className="roll-banner" role="status">
              <strong>Prochaine étape : Lots 4.3 & 4.4</strong>
              <span>
                Vos notes actuelles et votre inventaire existant restent accessibles et consultables en Mode Cockpit.
              </span>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
