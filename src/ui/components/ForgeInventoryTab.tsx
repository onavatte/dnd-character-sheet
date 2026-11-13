import type { Draft } from 'immer';
import type { CharacterSheetV1, DerivedCharacterStats } from '../../engine';
import { ForgeInventorySection } from './ForgeInventorySection';
import { ForgePurseAndNotesSection } from './ForgePurseAndNotesSection';

export interface ForgeInventoryTabProps {
  sheet: CharacterSheetV1;
  derived: DerivedCharacterStats;
  onMutate: (recipe: (draft: Draft<CharacterSheetV1>) => void) => void;
}

/**
 * Onglet 4 de la Forge d'édition : Inventaire (gauche) + Bourse & Notes (droite).
 */
export function ForgeInventoryTab({
  sheet,
  derived,
  onMutate,
}: ForgeInventoryTabProps) {
  return (
    <div className="forge-grid">
      <ForgeInventorySection
        sheet={sheet}
        derived={derived}
        onMutate={onMutate}
      />
      <ForgePurseAndNotesSection
        sheet={sheet}
        derived={derived}
        onMutate={onMutate}
      />
    </div>
  );
}
