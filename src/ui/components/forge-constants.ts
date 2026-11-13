import type { ProficiencyLevel, RecoveryTiming } from '../../engine';

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
