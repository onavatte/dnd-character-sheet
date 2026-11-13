import { useState } from 'react';
import type { Draft } from 'immer';
import type { CharacterSheetV1, DerivedCharacterStats } from '../../engine/types';
import { ForgeCombatAndSpellsTab } from './ForgeCombatAndSpellsTab';
import { ForgeIdentityTab } from './ForgeIdentityTab';
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
        >
          <ForgeCombatAndSpellsTab
            sheet={sheet}
            derived={derived}
            onMutate={onMutate}
          />
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
