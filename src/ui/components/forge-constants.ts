import type {
  ActionTiming,
  InventoryCategory,
  NoteCategory,
  ProficiencyLevel,
  RecoveryTiming,
  StandardCurrencyKey,
} from '../../engine';

export const PROFICIENCY_OPTIONS: ReadonlyArray<{
  value: ProficiencyLevel;
  label: string;
}> = [
  { value: 'none', label: 'Aucune' },
  { value: 'half', label: 'Demi-maîtrise (1/2)' },
  { value: 'proficient', label: 'Maîtrise' },
  { value: 'expertise', label: 'Expertise (x2)' },
];

export const RECOVERY_OPTIONS: ReadonlyArray<{
  value: RecoveryTiming;
  label: string;
}> = [
  { value: 'short_rest', label: 'Repos Court' },
  { value: 'long_rest', label: 'Repos Long' },
  { value: 'manual', label: 'Manuel' },
];

export const ACTION_TIMING_OPTIONS: ReadonlyArray<{
  value: ActionTiming;
  label: string;
}> = [
  { value: 'action', label: 'Action' },
  { value: 'bonus_action', label: 'Action bonus' },
  { value: 'reaction', label: 'Réaction' },
  { value: 'special', label: 'Spéciale' },
];

export const SPELL_LEVEL_OPTIONS: ReadonlyArray<{
  value: number;
  label: string;
  shortLabel: string;
}> = [
  { value: 0, label: 'Tour de magie (niv. 0)', shortLabel: 'Tour de magie' },
  { value: 1, label: 'Niveau 1', shortLabel: 'Niv. 1' },
  { value: 2, label: 'Niveau 2', shortLabel: 'Niv. 2' },
  { value: 3, label: 'Niveau 3', shortLabel: 'Niv. 3' },
  { value: 4, label: 'Niveau 4', shortLabel: 'Niv. 4' },
  { value: 5, label: 'Niveau 5', shortLabel: 'Niv. 5' },
  { value: 6, label: 'Niveau 6', shortLabel: 'Niv. 6' },
  { value: 7, label: 'Niveau 7', shortLabel: 'Niv. 7' },
  { value: 8, label: 'Niveau 8', shortLabel: 'Niv. 8' },
  { value: 9, label: 'Niveau 9', shortLabel: 'Niv. 9' },
];

export const INVENTORY_CATEGORY_OPTIONS: ReadonlyArray<{
  value: InventoryCategory;
  label: string;
}> = [
  { value: 'gear', label: 'Équipement' },
  { value: 'weapon', label: 'Arme' },
  { value: 'armor', label: 'Armure & Bouclier' },
  { value: 'consumable', label: 'Consommable' },
  { value: 'treasure', label: 'Trésor & Valeur' },
  { value: 'other', label: 'Divers' },
];

export function getInventoryCategoryLabel(category?: InventoryCategory): string {
  const found = INVENTORY_CATEGORY_OPTIONS.find((opt) => opt.value === category);
  return found ? found.label : 'Équipement';
}

export const STANDARD_CURRENCY_META: ReadonlyArray<{
  key: StandardCurrencyKey;
  abbr: string;
  label: string;
  gpRate: string;
}> = [
  { key: 'pp', abbr: 'pp', label: 'Platine', gpRate: '10 po' },
  { key: 'gp', abbr: 'po', label: 'Or', gpRate: '1 po' },
  { key: 'ep', abbr: 'pe', label: 'Électrum', gpRate: '0,5 po' },
  { key: 'sp', abbr: 'pa', label: 'Argent', gpRate: '0,1 po' },
  { key: 'cp', abbr: 'pc', label: 'Cuivre', gpRate: '0,01 po' },
];

export const NOTE_CATEGORY_OPTIONS: ReadonlyArray<{
  value: NoteCategory;
  label: string;
}> = [
  { value: 'loot', label: 'Butin & Objets' },
  { value: 'quest', label: 'Quêtes & Pistes' },
  { value: 'npc', label: 'PNJ & Factions' },
  { value: 'location', label: 'Lieux & Cartes' },
  { value: 'lore', label: 'Savoir & Indices' },
  { value: 'other', label: 'Divers' },
];

export function getNoteCategoryLabel(category: NoteCategory): string {
  const found = NOTE_CATEGORY_OPTIONS.find((opt) => opt.value === category);
  return found ? found.label : 'Divers';
}
