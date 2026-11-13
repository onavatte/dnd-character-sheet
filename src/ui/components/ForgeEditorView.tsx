import { useState } from 'react';
import type { Draft } from 'immer';
import type { CharacterSheetV1, DerivedCharacterStats } from '../../engine/types';
import { ForgeCombatAndSpellsTab } from './ForgeCombatAndSpellsTab';
import { ForgeFeaturesAndDefensesTab } from './ForgeFeaturesAndDefensesTab';
import { ForgeIdentityTab } from './ForgeIdentityTab';
import { ForgeInventoryTab } from './ForgeInventoryTab';
import { ForgeStatsAndSkillsTab } from './ForgeStatsAndSkillsTab';

export type ForgeTabId =
  | 'identity'
  | 'stats'
  | 'features'
  | 'combat'
  | 'inventory';

interface ForgeTabMeta {
  id: ForgeTabId;
  label: string;
}

const FORGE_TABS: readonly ForgeTabMeta[] = [
  { id: 'identity', label: '1. Identité & Classes' },
  { id: 'stats', label: '2. Stats & Compétences' },
  { id: 'features', label: '3. Aptitudes & Défenses' },
  { id: 'combat', label: '4. Ressources, Armes & Sorts' },
  { id: 'inventory', label: '5. Inventaire & Notes' },
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

      {activeTab === 'features' && (
        <div
          role="tabpanel"
          id="forge-panel-features"
          aria-labelledby="forge-tab-features"
        >
          <ForgeFeaturesAndDefensesTab sheet={sheet} onMutate={onMutate} />
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
        >
          <ForgeInventoryTab
            sheet={sheet}
            derived={derived}
            onMutate={onMutate}
          />
        </div>
      )}
    </main>
  );
}
