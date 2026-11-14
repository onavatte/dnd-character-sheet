import type { Draft } from 'immer';
import type { CharacterSheetV1, DerivedCharacterStats } from '../../engine';
import { ForgeAttacksSection } from './ForgeAttacksSection';
import { ForgeResourcesSection } from './ForgeResourcesSection';
import { ForgeSpellcastingSection } from './ForgeSpellcastingSection';

export interface ForgeCombatAndSpellsTabProps {
  sheet: CharacterSheetV1;
  derived: DerivedCharacterStats;
  onMutate: (recipe: (draft: Draft<CharacterSheetV1>) => void) => void;
}

/**
 * Onglet 3 de la Forge : Armes & Attaques + Ressources suivies en haut,
 * puis Incantation, Emplacements & Grimoire en pleine largeur.
 */
export function ForgeCombatAndSpellsTab({
  sheet,
  derived,
  onMutate,
}: ForgeCombatAndSpellsTabProps) {
  return (
    <div className="forge-stack">
      <div className="forge-grid">
        <ForgeAttacksSection
          sheet={sheet}
          derived={derived}
          onMutate={onMutate}
        />
        <ForgeResourcesSection
          sheet={sheet}
          derived={derived}
          onMutate={onMutate}
        />
      </div>

      <ForgeSpellcastingSection
        sheet={sheet}
        derived={derived}
        onMutate={onMutate}
      />
    </div>
  );
}
