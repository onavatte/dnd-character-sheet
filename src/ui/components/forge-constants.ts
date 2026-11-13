import type {
  ActionTiming,
  ProficiencyLevel,
  RecoveryTiming,
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
