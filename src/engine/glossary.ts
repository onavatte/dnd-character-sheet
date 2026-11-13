/**
 * Lexique bilingue FR/EN pour D&D 5e (2014), utilitaires de recherche insensible
 * à la langue/accents et générateur de personnage de démonstration.
 */

import type {
  AbilityKey,
  BilingualNamed,
  CharacterSheetV1,
  LanguageEntry,
  SkillDefinition,
  ToolProficiency,
} from './types';

export interface ToolPreset {
  name: string;
  originalName: string;
  ability: AbilityKey;
}

export const TOOL_PRESETS: readonly ToolPreset[] = [
  { name: 'Outils de voleur', originalName: "Thieves' Tools", ability: 'DEX' },
  { name: 'Outils de forgeron', originalName: "Smith's Tools", ability: 'STR' },
  { name: "Matériel d'alchimiste", originalName: "Alchemist's Supplies", ability: 'INT' },
  { name: "Kit d'herboriste", originalName: 'Herbalism Kit', ability: 'WIS' },
  { name: 'Kit de déguisement', originalName: 'Disguise Kit', ability: 'CHA' },
  { name: 'Outils de bricoleur', originalName: "Tinker's Tools", ability: 'INT' },
  { name: 'Véhicules terrestres', originalName: 'Vehicles (Land)', ability: 'DEX' },
  { name: 'Trousse de piratage', originalName: 'Cyberdeck / Hacking Kit', ability: 'INT' },
];

export const LANGUAGE_PRESETS: readonly Omit<LanguageEntry, 'id'>[] = [
  { name: 'Commun', originalName: 'Common' },
  { name: 'Elfique', originalName: 'Elvish' },
  { name: 'Nain', originalName: 'Dwarvish' },
  { name: 'Halfelin', originalName: 'Halfling' },
  { name: 'Draconique', originalName: 'Draconic' },
  { name: 'Sylvestre', originalName: 'Sylvan' },
  { name: 'Infernal', originalName: 'Infernal' },
  { name: 'Abyssal', originalName: 'Abyssal' },
  { name: 'Argot des voleurs', originalName: "Thieves' Cant" },
];

export interface AbilityGlossaryEntry {
  key: AbilityKey;
  abbrFr: string;
  abbrEn: string;
  name: string;
  originalName: string;
}

export const ABILITY_GLOSSARY: Record<AbilityKey, AbilityGlossaryEntry> = {
  STR: {
    key: 'STR',
    abbrFr: 'FOR',
    abbrEn: 'STR',
    name: 'Force',
    originalName: 'Strength',
  },
  DEX: {
    key: 'DEX',
    abbrFr: 'DEX',
    abbrEn: 'DEX',
    name: 'Dextérité',
    originalName: 'Dexterity',
  },
  CON: {
    key: 'CON',
    abbrFr: 'CON',
    abbrEn: 'CON',
    name: 'Constitution',
    originalName: 'Constitution',
  },
  INT: {
    key: 'INT',
    abbrFr: 'INT',
    abbrEn: 'INT',
    name: 'Intelligence',
    originalName: 'Intelligence',
  },
  WIS: {
    key: 'WIS',
    abbrFr: 'SAG',
    abbrEn: 'WIS',
    name: 'Sagesse',
    originalName: 'Wisdom',
  },
  CHA: {
    key: 'CHA',
    abbrFr: 'CHA',
    abbrEn: 'CHA',
    name: 'Charisme',
    originalName: 'Charisma',
  },
};

export interface CanonicalSkillTemplate {
  id: string;
  name: string;
  originalName: string;
  ability: AbilityKey;
}

export const CANONICAL_SKILLS_5E: readonly CanonicalSkillTemplate[] = [
  { id: 'acrobatics', name: 'Acrobaties', originalName: 'Acrobatics', ability: 'DEX' },
  { id: 'animal_handling', name: 'Dressage', originalName: 'Animal Handling', ability: 'WIS' },
  { id: 'arcana', name: 'Arcanes', originalName: 'Arcana', ability: 'INT' },
  { id: 'athletics', name: 'Athlétisme', originalName: 'Athletics', ability: 'STR' },
  { id: 'deception', name: 'Tromperie', originalName: 'Deception', ability: 'CHA' },
  { id: 'history', name: 'Histoire', originalName: 'History', ability: 'INT' },
  { id: 'insight', name: 'Perspicacité', originalName: 'Insight', ability: 'WIS' },
  { id: 'intimidation', name: 'Intimidation', originalName: 'Intimidation', ability: 'CHA' },
  { id: 'investigation', name: 'Investigation', originalName: 'Investigation', ability: 'INT' },
  { id: 'medicine', name: 'Médecine', originalName: 'Medicine', ability: 'WIS' },
  { id: 'nature', name: 'Nature', originalName: 'Nature', ability: 'INT' },
  { id: 'perception', name: 'Perception', originalName: 'Perception', ability: 'WIS' },
  { id: 'performance', name: 'Représentation', originalName: 'Performance', ability: 'CHA' },
  { id: 'persuasion', name: 'Persuasion', originalName: 'Persuasion', ability: 'CHA' },
  { id: 'religion', name: 'Religion', originalName: 'Religion', ability: 'INT' },
  { id: 'sleight_of_hand', name: 'Escamotage', originalName: 'Sleight of Hand', ability: 'DEX' },
  { id: 'stealth', name: 'Discrétion', originalName: 'Stealth', ability: 'DEX' },
  { id: 'survival', name: 'Survie', originalName: 'Survival', ability: 'WIS' },
] as const;

export const CANONICAL_CONDITIONS_5E: readonly BilingualNamed[] = [
  { id: 'blinded', name: 'Aveuglé', originalName: 'Blinded' },
  { id: 'charmed', name: 'Charmé', originalName: 'Charmed' },
  { id: 'deafened', name: 'Assourdi', originalName: 'Deafened' },
  { id: 'frightened', name: 'Effrayé', originalName: 'Frightened' },
  { id: 'grappled', name: 'Agrippé', originalName: 'Grappled' },
  { id: 'incapacitated', name: 'Neutralisé', originalName: 'Incapacitated' },
  { id: 'invisible', name: 'Invisible', originalName: 'Invisible' },
  { id: 'paralyzed', name: 'Paralysé', originalName: 'Paralyzed' },
  { id: 'petrified', name: 'Pétrifié', originalName: 'Petrified' },
  { id: 'poisoned', name: 'Empoisonné', originalName: 'Poisoned' },
  { id: 'prone', name: 'À terre', originalName: 'Prone' },
  { id: 'restrained', name: 'Entravé', originalName: 'Restrained' },
  { id: 'stunned', name: 'Étourdi', originalName: 'Stunned' },
  { id: 'unconscious', name: 'Inconscient', originalName: 'Unconscious' },
  { id: 'irradiated', name: 'Irradié', originalName: 'Irradiated' },
] as const;

/**
 * Normalise une chaîne pour la recherche (minuscules, suppression des accents/diacritiques).
 */
export function normalizeSearchText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Recherche bilingue : retourne true si la requête correspond au nom principal
 * ou au nom secondaire (originalName), sans tenir compte des accents ni de la casse.
 */
export function matchesBilingualSearch(
  item: { name: string; originalName?: string },
  query: string,
): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length === 0) {
    return true;
  }
  if (normalizeSearchText(item.name).includes(normalizedQuery)) {
    return true;
  }
  if (
    item.originalName !== undefined &&
    normalizeSearchText(item.originalName).includes(normalizedQuery)
  ) {
    return true;
  }
  return false;
}

/**
 * Génère la liste initiale des 18 compétences officielles D&D 5e (2014).
 */
export function createDefaultSkills(): SkillDefinition[] {
  return CANONICAL_SKILLS_5E.map((template) => ({
    id: template.id,
    name: template.name,
    originalName: template.originalName,
    ability: template.ability,
    proficiency: 'none',
    bonusFlat: 0,
    isCustom: false,
  }));
}

/**
 * Crée une fiche de personnage complète de démonstration (Multi-classé Rôdeur 5 / Roublard 2,
 * ambiance D&D 5e Moderne / Post-Apo) servant à la fois de fixture de test et de démo.
 */
export function createDemoCharacter(nowIso = '2026-11-11T12:00:00.000Z'): CharacterSheetV1 {
  const skills = createDefaultSkills().map((skill): SkillDefinition => {
    if (skill.id === 'stealth' || skill.id === 'perception') {
      return { ...skill, proficiency: 'expertise' };
    }
    if (
      skill.id === 'sleight_of_hand' ||
      skill.id === 'survival' ||
      skill.id === 'investigation' ||
      skill.id === 'athletics'
    ) {
      return { ...skill, proficiency: 'proficient' };
    }
    return skill;
  });

  skills.push({
    id: 'custom_hacking',
    name: 'Informatique & Systèmes',
    originalName: 'Hacking & Systems',
    ability: 'INT',
    proficiency: 'proficient',
    bonusFlat: 1,
    isCustom: true,
  });

  return {
    schemaVersion: 1,
    id: 'demo-kaelen-vance',
    updatedAt: nowIso,
    revision: 1,
    preferences: {
      termDisplayMode: 'bilingual',
      theme: 'light',
    },
    identity: {
      name: 'Kaelen Vance',
      classes: [
        {
          id: 'class-ranger',
          name: 'Rôdeur',
          originalName: 'Ranger',
          subclass: {
            name: 'Traqueur des Ruines',
            originalName: 'Gloom Stalker',
          },
          level: 5,
          hitDieSize: 10,
          spellcastingAbility: 'WIS',
        },
        {
          id: 'class-rogue',
          name: 'Roublard',
          originalName: 'Rogue',
          level: 2,
          hitDieSize: 8,
        },
      ],
      background: 'Éclaireur du Secteur Zéro',
      ancestry: 'Humain (Variant)',
    },
    abilities: {
      STR: 12,
      DEX: 18,
      CON: 14,
      INT: 14,
      WIS: 16,
      CHA: 10,
    },
    savingThrowProficiencies: {
      STR: true,
      DEX: true,
      CON: false,
      INT: false,
      WIS: false,
      CHA: false,
    },
    skills,
    toolProficiencies: [
      {
        id: 'tool-thieves',
        name: 'Outils de voleur',
        originalName: "Thieves' Tools",
        ability: 'DEX',
        proficiency: 'proficient',
        bonusFlat: 0,
      },
      {
        id: 'tool-cyberdeck',
        name: 'Trousse de piratage',
        originalName: 'Cyberdeck / Hacking Kit',
        ability: 'INT',
        proficiency: 'proficient',
        bonusFlat: 1,
      },
    ] satisfies ToolProficiency[],
    languages: [
      { id: 'lang-common', name: 'Commun', originalName: 'Common' },
      { id: 'lang-elvish', name: 'Elfique', originalName: 'Elvish' },
      { id: 'lang-sylvan', name: 'Sylvestre', originalName: 'Sylvan' },
    ],
    combat: {
      hpCurrent: 52,
      hpMax: 58,
      hpTemp: 4,
      armorClassBase: 16,
      armorClassBonus: 1,
      speed: 9,
      initiativeBonusFlat: 3, // Dread Ambusher (+SAG)
      hitDicePools: {
        6: { total: 0, available: 0 },
        8: { total: 2, available: 2 },
        10: { total: 5, available: 4 },
        12: { total: 0, available: 0 },
      },
      deathSaves: { successes: 0, failures: 0 },
      exhaustionLevel: 0,
      conditions: [],
    },
    resources: [
      {
        id: 'res-cells',
        name: 'Cellules railgun',
        originalName: 'Railgun Cells',
        current: 5,
        max: 6,
        recovery: 'manual',
      },
      {
        id: 'res-stim',
        name: 'Injecteur Adrénaline',
        originalName: 'Adrenaline Surge',
        current: 1,
        max: 1,
        recovery: 'short_rest',
      },
      {
        id: 'res-veil',
        name: 'Camouflage optique',
        originalName: 'Nature’s Veil',
        current: 2,
        max: 3,
        recovery: 'long_rest',
      },
    ],
    attacks: [
      {
        id: 'atk-carbine',
        name: 'Carabine magnétique M4',
        originalName: 'Magnetic Carbine',
        ability: 'DEX',
        proficient: true,
        attackBonusFlat: 1,
        damageFormula: '1d10 + 5',
        damageType: 'Balistique',
        range: '45/180 m',
        actionTiming: 'action',
        ammoResourceId: 'res-cells',
        notes: 'Arme à deux mains, rechargement, attaque sournoise (+1d6)',
      },
      {
        id: 'atk-vibroknife',
        name: 'Vibro-lame tactique',
        originalName: 'Vibro-Dagger',
        ability: 'DEX',
        proficient: true,
        attackBonusFlat: 0,
        damageFormula: '1d4 + 4',
        damageType: 'Perforant',
        range: 'Allonge 1,5 m (Lancer 6/18 m)',
        actionTiming: 'action',
        critRangeMin: 19,
        notes: 'Finesse, légère, critique étendu (19-20)',
      },
    ],
    spellcasting: {
      defaultAbility: 'WIS',
      slots: {
        1: { max: 4, used: 1 },
        2: { max: 2, used: 0 },
      },
      abilitiesList: [
        {
          id: 'spell-plasma-bolt',
          level: 0,
          name: 'Décharge thermique',
          originalName: 'Fire Bolt',
          ability: 'WIS',
          prepared: true,
          castingTime: 'Action',
          range: '36 m',
          hasAttackRoll: true,
          damageFormula: '2d10',
          damageType: 'Feu / Thermique',
          description: 'Arc énergétique surchauffé tiré depuis le gantelet sur une cible à portée.',
        },
        {
          id: 'spell-hunters-mark',
          level: 1,
          name: 'Marque du chasseur',
          originalName: "Hunter's Mark",
          ability: 'WIS',
          prepared: true,
          castingTime: 'Action bonus',
          range: '27 m',
          damageFormula: '1d6',
          damageType: 'Bonus arme',
          description: '+1d6 dégâts sur la cible marquée et avantage aux jets de pistage.',
        },
        {
          id: 'spell-hail-of-thorns',
          level: 1,
          name: "Grêle d'épines",
          originalName: 'Hail of Thorns',
          ability: 'WIS',
          prepared: true,
          castingTime: 'Action bonus',
          range: 'Personnelle (rayon 1,5 m)',
          saveAbility: 'DEX',
          damageFormula: '1d10',
          damageType: 'Perforant',
          description: 'Explosion de shrapnel au prochain tir : demi-dégâts en cas de JS DEX réussi.',
        },
        {
          id: 'spell-pass-without-trace',
          level: 2,
          name: 'Passage sans trace',
          originalName: 'Pass Without Trace',
          ability: 'WIS',
          prepared: true,
          castingTime: 'Action',
          range: 'Personnelle (rayon 9 m)',
          description: 'Bonus de +10 aux jets de Discrétion (Stealth) pour le groupe.',
        },
      ],
    },
    inventory: [
      {
        id: 'inv-armor',
        name: 'Armure composite légère Mk-II',
        originalName: 'Studded Kevlar Vest',
        quantity: 1,
        weight: 6,
        equipped: true,
        notes: 'CA 12 + Mod. DEX',
      },
      {
        id: 'inv-cyberdeck',
        name: 'Terminal de terrain décrypté',
        originalName: 'Field Cyberdeck',
        quantity: 1,
        weight: 1.5,
        equipped: true,
        notes: 'Outils de voleur & interface réseau (+1 Informatique)',
      },
    ],
    notes: 'Campagne Post-Apo : survivant de l’effondrement orbital.',
  };
}

export interface BlankCharacterOptions {
  id?: string;
  name?: string;
  nowIso?: string;
}

/**
 * Crée une fiche de personnage vierge de niveau 1 prête à être façonnée en Mode Édition (Forge).
 */
export function createBlankCharacter(
  options: BlankCharacterOptions = {},
): CharacterSheetV1 {
  const nowIso = options.nowIso ?? new Date().toISOString();
  const id =
    options.id ??
    `char-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const name = options.name?.trim() || 'Nouvel Aventurier';

  return {
    schemaVersion: 1,
    id,
    updatedAt: nowIso,
    revision: 1,
    preferences: {
      termDisplayMode: 'bilingual',
      theme: 'light',
    },
    identity: {
      name,
      classes: [
        {
          id: 'class-1',
          name: 'Aventurier',
          originalName: 'Adventurer',
          level: 1,
          hitDieSize: 10,
        },
      ],
      background: 'Voyageur',
      ancestry: 'Humain',
    },
    abilities: {
      STR: 10,
      DEX: 10,
      CON: 10,
      INT: 10,
      WIS: 10,
      CHA: 10,
    },
    savingThrowProficiencies: {
      STR: false,
      DEX: false,
      CON: false,
      INT: false,
      WIS: false,
      CHA: false,
    },
    skills: createDefaultSkills(),
    toolProficiencies: [],
    languages: [],
    combat: {
      hpCurrent: 10,
      hpMax: 10,
      hpTemp: 0,
      armorClassBase: 10,
      armorClassBonus: 0,
      speed: 9,
      initiativeBonusFlat: 0,
      hitDicePools: {
        6: { total: 0, available: 0 },
        8: { total: 0, available: 0 },
        10: { total: 1, available: 1 },
        12: { total: 0, available: 0 },
      },
      deathSaves: { successes: 0, failures: 0 },
      exhaustionLevel: 0,
      conditions: [],
    },
    resources: [],
    attacks: [],
    inventory: [],
    notes: '',
  };
}
