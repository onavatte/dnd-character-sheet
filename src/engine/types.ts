/**
 * Modèle de données du domaine D&D 5e (Édition 2014 + Adaptations Modernes/Post-Apo).
 * Aucun import de React, du DOM ni de la couche de stockage.
 */

export type AbilityKey = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
export type ProficiencyLevel = 'none' | 'half' | 'proficient' | 'expertise';
export type RecoveryTiming = 'short_rest' | 'long_rest' | 'manual';
export type HitDieSize = 6 | 8 | 10 | 12;
export type TermDisplayMode = 'bilingual' | 'fr' | 'en';
export type ThemeMode = 'light' | 'dark';
export type AdvantageState = 'normal' | 'advantage' | 'disadvantage';
export type ActionTiming = 'action' | 'bonus_action' | 'reaction' | 'special';

export const ABILITY_KEYS: readonly AbilityKey[] = [
  'STR',
  'DEX',
  'CON',
  'INT',
  'WIS',
  'CHA',
] as const;

export const HIT_DIE_SIZES: readonly HitDieSize[] = [6, 8, 10, 12] as const;

export interface BilingualNamed {
  id: string;
  name: string;
  originalName?: string;
}

export interface CharacterClassEntry extends BilingualNamed {
  subclass?: {
    name: string;
    originalName?: string;
  };
  level: number;
  hitDieSize: HitDieSize;
  spellcastingAbility?: AbilityKey;
}

export type HitDicePools = Record<
  HitDieSize,
  {
    total: number;
    available: number;
  }
>;

export interface SkillDefinition extends BilingualNamed {
  ability: AbilityKey;
  proficiency: ProficiencyLevel;
  bonusFlat: number;
  isCustom: boolean;
}

export interface ToolProficiency extends BilingualNamed {
  ability: AbilityKey;
  proficiency: ProficiencyLevel;
  bonusFlat: number;
}

export type LanguageEntry = BilingualNamed;

export interface TrackedResource extends BilingualNamed {
  current: number;
  max: number;
  recovery: RecoveryTiming;
}

export interface AttackEntry extends BilingualNamed {
  ability: AbilityKey;
  proficient: boolean;
  attackBonusFlat: number;
  damageFormula: string;
  damageType: string;
  range: string;
  actionTiming?: ActionTiming;
  ammoResourceId?: string;
  /** Score minimum naturel sur le d20 déclenchant un coup critique (20 par défaut, ex. 19 pour 19-20). */
  critRangeMin?: number;
  notes: string;
}

export interface SpellAbilityEntry extends BilingualNamed {
  level: number;
  ability?: AbilityKey;
  prepared: boolean;
  castingTime: string;
  range: string;
  description: string;
  hasAttackRoll?: boolean;
  saveAbility?: AbilityKey;
  damageFormula?: string;
  damageType?: string;
  /** Score minimum naturel sur le d20 déclenchant un critique pour les sorts avec attaque (20 par défaut). */
  critRangeMin?: number;
}

export interface SpellcastingState {
  defaultAbility: AbilityKey;
  slots: Record<number, { max: number; used: number }>;
  pactSlots?: { level: number; max: number; used: number };
  abilitiesList: SpellAbilityEntry[];
}

export interface InventoryItem extends BilingualNamed {
  quantity: number;
  weight: number;
  equipped: boolean;
  notes: string;
}

export interface CharacterSheetV1 {
  schemaVersion: 1;
  id: string;
  updatedAt: string;
  revision: number;
  preferences?: {
    termDisplayMode: TermDisplayMode;
    theme?: ThemeMode;
  };
  identity: {
    name: string;
    portraitDataUrl?: string;
    classes: CharacterClassEntry[];
    background: string;
    ancestry: string;
    backstory: string;
  };
  abilities: Record<AbilityKey, number>;
  savingThrowProficiencies: Record<AbilityKey, boolean>;
  skills: SkillDefinition[];
  toolProficiencies?: ToolProficiency[];
  languages?: LanguageEntry[];
  combat: {
    hpCurrent: number;
    hpMax: number;
    hpTemp: number;
    armorClassBase: number;
    armorClassBonus: number;
    speed: number;
    initiativeBonusFlat: number;
    hitDicePools: HitDicePools;
    deathSaves: { successes: number; failures: number };
    exhaustionLevel: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    conditions: string[];
  };
  resources: TrackedResource[];
  attacks: AttackEntry[];
  spellcasting?: SpellcastingState;
  inventory: InventoryItem[];
  notes: string;
}

export interface CharacterSnapshot {
  snapshotId: string;
  characterId: string;
  createdAt: string;
  label: string;
  payload: CharacterSheetV1;
}

export interface DerivedSkillStat {
  id: string;
  name: string;
  originalName?: string;
  ability: AbilityKey;
  proficiency: ProficiencyLevel;
  modifier: number;
  passive: number;
  isCustom: boolean;
}

export interface DerivedToolStat {
  id: string;
  name: string;
  originalName?: string;
  ability: AbilityKey;
  proficiency: ProficiencyLevel;
  modifier: number;
}

export interface DerivedAttackStat {
  id: string;
  name: string;
  originalName?: string;
  toHitBonus: number;
  damageFormula: string;
  damageType: string;
  range: string;
  critRangeMin: number;
}

export interface DerivedCharacterStats {
  totalLevel: number;
  proficiencyBonus: number;
  abilityModifiers: Record<AbilityKey, number>;
  savingThrows: Record<AbilityKey, { modifier: number; proficient: boolean }>;
  armorClass: number;
  initiative: number;
  passivePerception: number;
  passiveInvestigation: number;
  passiveInsight: number;
  skills: DerivedSkillStat[];
  tools: DerivedToolStat[];
  attacks: DerivedAttackStat[];
  spellcastingByAbility: Partial<
    Record<AbilityKey, { saveDC: number; attackBonus: number }>
  >;
  totalWeight: number;
}
