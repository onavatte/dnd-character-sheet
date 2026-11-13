import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import type { Draft } from 'immer';
import {
  ABILITY_GLOSSARY,
  ABILITY_KEYS,
  TOOL_PRESETS,
  formatSignedModifier,
} from '../../engine';
import type {
  AbilityKey,
  CharacterSheetV1,
  DerivedCharacterStats,
  ProficiencyLevel,
} from '../../engine';
import { PROFICIENCY_OPTIONS } from './forge-constants';
import { CommittedTextInput, NumberStepper } from './ForgeSharedControls';

function getProficiencyMarker(proficiency: ProficiencyLevel): string {
  switch (proficiency) {
    case 'expertise':
      return '★★';
    case 'proficient':
      return '★';
    case 'half':
      return '½';
    case 'none':
      return '·';
  }
}

export interface ForgeStatsAndSkillsTabProps {
  sheet: CharacterSheetV1;
  derived: DerivedCharacterStats;
  onMutate: (recipe: (draft: Draft<CharacterSheetV1>) => void) => void;
}

export function ForgeStatsAndSkillsTab({
  sheet,
  derived,
  onMutate,
}: ForgeStatsAndSkillsTabProps) {
  const baseId = useId();
  const [customName, setCustomName] = useState('');
  const [customOriginalName, setCustomOriginalName] = useState('');
  const [customAbility, setCustomAbility] = useState<AbilityKey>('INT');
  const [customProficiency, setCustomProficiency] =
    useState<ProficiencyLevel>('proficient');
  const [customBonusFlat, setCustomBonusFlat] = useState(0);

  const [toolName, setToolName] = useState('');
  const [toolOriginalName, setToolOriginalName] = useState('');
  const [toolAbility, setToolAbility] = useState<AbilityKey>('DEX');
  const [toolProficiency, setToolProficiency] =
    useState<ProficiencyLevel>('proficient');
  const [toolBonusFlat, setToolBonusFlat] = useState(0);

  const toolProficiencies = sheet.toolProficiencies ?? [];

  const handleAddTool = (
    name: string,
    originalName: string | undefined,
    ability: AbilityKey,
    proficiency: ProficiencyLevel,
    bonusFlat: number,
  ) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newId = `tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const trimmedOrig = originalName?.trim();
    onMutate((draft) => {
      draft.toolProficiencies ??= [];
      draft.toolProficiencies.push({
        id: newId,
        name: trimmed,
        ...(trimmedOrig ? { originalName: trimmedOrig } : {}),
        ability,
        proficiency,
        bonusFlat,
      });
    });
  };

  const handleAddToolFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!toolName.trim()) return;
    handleAddTool(
      toolName,
      toolOriginalName,
      toolAbility,
      toolProficiency,
      toolBonusFlat,
    );
    setToolName('');
    setToolOriginalName('');
    setToolAbility('DEX');
    setToolProficiency('proficient');
    setToolBonusFlat(0);
  };

  const handleAddCustomSkill = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = customName.trim();
    if (!trimmed) return;

    const newId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    onMutate((draft) => {
      draft.skills.push({
        id: newId,
        name: trimmed,
        ...(customOriginalName.trim()
          ? { originalName: customOriginalName.trim() }
          : {}),
        ability: customAbility,
        proficiency: customProficiency,
        bonusFlat: customBonusFlat,
        isCustom: true,
      });
    });

    setCustomName('');
    setCustomOriginalName('');
    setCustomAbility('INT');
    setCustomProficiency('proficient');
    setCustomBonusFlat(0);
  };

  return (
    <div className="forge-stack">
      {/* Bloc 1 : Caractéristiques, Sauvegardes & Combat */}
      <div className="forge-grid forge-stats-top-grid">
        <section
          className="grimoire-card forge-card"
          aria-label="Scores de caractéristiques et maîtrises de sauvegarde"
        >
          <h2>Caractéristiques & Jets de Sauvegarde</h2>
          <div className="forge-abilities-grid">
            {ABILITY_KEYS.map((key) => {
              const glossary = ABILITY_GLOSSARY[key];
              const score = sheet.abilities[key];
              const mod = derived.abilityModifiers[key];
              const isProficientSave = sheet.savingThrowProficiencies[key];
              const saveMod = derived.savingThrows[key].modifier;
              const abilityInputId = `${baseId}-abil-${key}`;
              const saveCheckboxId = `${baseId}-save-${key}`;

              return (
                <div key={key} className="ability-card">
                  <div className="forge-ability-main">
                    <label
                      htmlFor={abilityInputId}
                      className="ability-abbr"
                    >
                      {glossary.abbrFr}
                    </label>
                    <div className="forge-ability-stepper">
                      <button
                        type="button"
                        className="stepper-btn forge-ability-step-btn tabular-nums"
                        disabled={score <= 1}
                        aria-label={`Diminuer ${glossary.abbrFr}`}
                        onClick={() =>
                          onMutate((draft) => {
                            draft.abilities[key] = Math.max(1, score - 1);
                          })
                        }
                      >
                        -
                      </button>
                      <span className="ability-value-line tabular-nums">
                        <input
                          id={abilityInputId}
                          name={`ability-${key}`}
                          type="number"
                          className="ability-raw-score forge-ability-score-input tabular-nums"
                          value={score}
                          min={1}
                          max={30}
                          onChange={(e) => {
                            const parsed = Number(e.target.value);
                            if (
                              e.target.value.trim() !== '' &&
                              Number.isFinite(parsed)
                            ) {
                              const clamped = Math.min(
                                30,
                                Math.max(1, Math.trunc(parsed)),
                              );
                              onMutate((draft) => {
                                draft.abilities[key] = clamped;
                              });
                            }
                          }}
                        />
                        <span className="ability-mod-inline">
                          ({formatSignedModifier(mod)})
                        </span>
                      </span>
                      <button
                        type="button"
                        className="stepper-btn forge-ability-step-btn tabular-nums"
                        disabled={score >= 30}
                        aria-label={`Augmenter ${glossary.abbrFr}`}
                        onClick={() =>
                          onMutate((draft) => {
                            draft.abilities[key] = Math.min(30, score + 1);
                          })
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <label
                    htmlFor={saveCheckboxId}
                    className={
                      isProficientSave
                        ? 'ability-save-btn forge-ability-save-toggle forge-ability-save-toggle--checked tabular-nums'
                        : 'ability-save-btn forge-ability-save-toggle tabular-nums'
                    }
                  >
                    <span className="forge-ability-save-left">
                      <input
                        id={saveCheckboxId}
                        name={`save-prof-${key}`}
                        type="checkbox"
                        checked={isProficientSave}
                        onChange={(e) =>
                          onMutate((draft) => {
                            draft.savingThrowProficiencies[key] = e.target.checked;
                          })
                        }
                      />
                      <span>Sauvegarde</span>
                    </span>
                    <strong>{formatSignedModifier(saveMod)}</strong>
                  </label>
                </div>
              );
            })}
          </div>
        </section>

        <section
          className="grimoire-card forge-card"
          aria-label="Vitalité, Classe d'Armure et Mobilité"
        >
          <h2>Vitalité, CA & Mobilité</h2>
          <div className="forge-kpi-strip" aria-label="Aperçu des valeurs calculées">
            <div className="forge-kpi-tile">
              <span className="forge-kpi-label">CA totale</span>
              <strong className="forge-kpi-value tabular-nums">
                {derived.armorClass}
              </strong>
            </div>
            <div className="forge-kpi-tile">
              <span className="forge-kpi-label">Initiative</span>
              <strong className="forge-kpi-value tabular-nums">
                {formatSignedModifier(derived.initiative)}
              </strong>
            </div>
            <div className="forge-kpi-tile">
              <span className="forge-kpi-label">Perc. passive</span>
              <strong className="forge-kpi-value tabular-nums">
                {derived.passivePerception}
              </strong>
            </div>
          </div>

          <fieldset className="forge-fieldset">
            <legend>Paramètres de combat</legend>
            <div className="forge-two-cols forge-combat-cols">
              <div className="field-group">
                <label htmlFor={`${baseId}-hp-max`}>PV Maximum</label>
                <NumberStepper
                  id={`${baseId}-hp-max`}
                  name="hpMax"
                  value={sheet.combat.hpMax}
                  min={1}
                  max={999}
                  decrementLabel="Réduire PV maximum"
                  incrementLabel="Augmenter PV maximum"
                  onChange={(nextMax) =>
                    onMutate((draft) => {
                      const cleanMax = Math.max(1, Math.trunc(nextMax));
                      draft.combat.hpMax = cleanMax;
                      draft.combat.hpCurrent = Math.min(
                        draft.combat.hpCurrent,
                        cleanMax,
                      );
                    })
                  }
                />
              </div>

              <div className="field-group">
                <label htmlFor={`${baseId}-hp-curr`}>PV Actuels</label>
                <NumberStepper
                  id={`${baseId}-hp-curr`}
                  name="hpCurrent"
                  value={sheet.combat.hpCurrent}
                  min={0}
                  max={sheet.combat.hpMax}
                  decrementLabel="Réduire PV actuels"
                  incrementLabel="Augmenter PV actuels"
                  onChange={(nextCurr) =>
                    onMutate((draft) => {
                      draft.combat.hpCurrent = Math.min(
                        draft.combat.hpMax,
                        Math.max(0, Math.trunc(nextCurr)),
                      );
                    })
                  }
                />
              </div>
            </div>

            <div className="forge-two-cols forge-combat-cols">
              <div className="field-group">
                <label htmlFor={`${baseId}-ac-base`}>
                  CA de base (Armure + DEX)
                </label>
                <NumberStepper
                  id={`${baseId}-ac-base`}
                  name="armorClassBase"
                  value={sheet.combat.armorClassBase}
                  min={0}
                  max={35}
                  decrementLabel="Réduire CA de base"
                  incrementLabel="Augmenter CA de base"
                  onChange={(nextBase) =>
                    onMutate((draft) => {
                      draft.combat.armorClassBase = Math.trunc(nextBase);
                    })
                  }
                />
              </div>

              <div className="field-group">
                <label htmlFor={`${baseId}-ac-bonus`}>
                  Bonus CA (Bouclier / Objets)
                </label>
                <NumberStepper
                  id={`${baseId}-ac-bonus`}
                  name="armorClassBonus"
                  value={sheet.combat.armorClassBonus}
                  min={-10}
                  max={20}
                  decrementLabel="Réduire bonus CA"
                  incrementLabel="Augmenter bonus CA"
                  onChange={(nextBonus) =>
                    onMutate((draft) => {
                      draft.combat.armorClassBonus = Math.trunc(nextBonus);
                    })
                  }
                />
              </div>
            </div>

            <div className="forge-two-cols forge-combat-cols">
              <div className="field-group">
                <label htmlFor={`${baseId}-speed`}>Vitesse (mètres)</label>
                <NumberStepper
                  id={`${baseId}-speed`}
                  name="speed"
                  value={sheet.combat.speed}
                  min={0}
                  max={60}
                  step={1.5}
                  decrementLabel="Réduire la vitesse"
                  incrementLabel="Augmenter la vitesse"
                  onChange={(nextSpeed) =>
                    onMutate((draft) => {
                      draft.combat.speed = nextSpeed;
                    })
                  }
                />
              </div>

              <div className="field-group">
                <label htmlFor={`${baseId}-init-flat`}>
                  Mod. divers d’Initiative
                </label>
                <NumberStepper
                  id={`${baseId}-init-flat`}
                  name="initiativeBonusFlat"
                  value={sheet.combat.initiativeBonusFlat}
                  min={-10}
                  max={20}
                  decrementLabel="Réduire bonus d'initiative"
                  incrementLabel="Augmenter bonus d'initiative"
                  onChange={(nextInit) =>
                    onMutate((draft) => {
                      draft.combat.initiativeBonusFlat = Math.trunc(nextInit);
                    })
                  }
                />
              </div>
            </div>
          </fieldset>
        </section>
      </div>

      {/* Bloc 2 : Compétences officielles & Personnalisées (Post-Apo / Homebrew) */}
      <section
        className="grimoire-card forge-card"
        aria-label="Édition des compétences et ajout de compétences personnalisées"
      >
        <h2>Compétences</h2>

        <details className="forge-details">
          <summary id={`${baseId}-custom-skill-title`}>
            Ajouter une compétence personnalisée
          </summary>
          <div className="forge-details-body">
            <form
              className="forge-custom-skill-form"
              aria-labelledby={`${baseId}-custom-skill-title`}
              onSubmit={handleAddCustomSkill}
            >
          <div className="forge-custom-skill-grid">
            <div className="field-group">
              <label htmlFor={`${baseId}-new-skill-name`}>Nom (FR) *</label>
              <input
                id={`${baseId}-new-skill-name`}
                name="customSkillName"
                type="text"
                className="forge-input"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ex. Navigation, Herboristerie..."
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor={`${baseId}-new-skill-vo`}>
                Nom VO (optionnel)
              </label>
              <input
                id={`${baseId}-new-skill-vo`}
                name="customSkillVo"
                type="text"
                className="forge-input"
                value={customOriginalName}
                onChange={(e) => setCustomOriginalName(e.target.value)}
                placeholder="Ex. Sailing, Herbalism..."
              />
            </div>

            <div className="field-group">
              <label htmlFor={`${baseId}-new-skill-abil`}>Caractéristique</label>
              <select
                id={`${baseId}-new-skill-abil`}
                name="customSkillAbility"
                className="forge-select"
                value={customAbility}
                onChange={(e) => setCustomAbility(e.target.value as AbilityKey)}
              >
                {ABILITY_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {ABILITY_GLOSSARY[key].abbrFr} ({ABILITY_GLOSSARY[key].name})
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label htmlFor={`${baseId}-new-skill-prof`}>Maîtrise</label>
              <select
                id={`${baseId}-new-skill-prof`}
                name="customSkillProficiency"
                className="forge-select"
                value={customProficiency}
                onChange={(e) =>
                  setCustomProficiency(e.target.value as ProficiencyLevel)
                }
              >
                {PROFICIENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label htmlFor={`${baseId}-new-skill-flat`}>Mod. divers</label>
              <NumberStepper
                id={`${baseId}-new-skill-flat`}
                name="customSkillFlat"
                value={customBonusFlat}
                min={-10}
                max={20}
                decrementLabel="Réduire le modificateur divers"
                incrementLabel="Augmenter le modificateur divers"
                onChange={(val) => setCustomBonusFlat(Math.trunc(val))}
              />
            </div>
          </div>

              <div>
                <button type="submit" className="action-btn action-btn--primary">
                  Ajouter la compétence
                </button>
              </div>
            </form>
          </div>
        </details>

        <div className="forge-skills-list">
          {sheet.skills.map((skill) => {
            const derivedSkill = derived.skills.find((s) => s.id === skill.id);
            const abilityMod = derived.abilityModifiers[skill.ability];
            const totalMod = derivedSkill?.modifier ?? 0;
            const profClass =
              skill.proficiency === 'expertise'
                ? 'forge-skill-row--expertise'
                : skill.proficiency === 'proficient'
                  ? 'forge-skill-row--proficient'
                  : '';

            return (
              <div
                key={skill.id}
                className={`forge-skill-row ${profClass} ${
                  skill.isCustom ? 'forge-skill-row--custom' : ''
                }`}
              >
                <div className="forge-skill-title">
                  {skill.isCustom ? (
                    <div className="forge-skill-custom-fields">
                      <div className="field-group">
                        <label htmlFor={`${baseId}-sk-name-${skill.id}`}>
                          Nom personnalisé
                        </label>
                        <CommittedTextInput
                          id={`${baseId}-sk-name-${skill.id}`}
                          name={`skill-name-${skill.id}`}
                          value={skill.name}
                          required
                          maxLength={60}
                          onCommit={(val) =>
                            onMutate((draft) => {
                              const target = draft.skills.find(
                                (s) => s.id === skill.id,
                              );
                              if (target) target.name = val.trim() || 'Compétence';
                            })
                          }
                        />
                      </div>
                      <div className="field-group">
                        <label htmlFor={`${baseId}-sk-abil-${skill.id}`}>
                          Caractéristique ({formatSignedModifier(abilityMod)})
                        </label>
                        <select
                          id={`${baseId}-sk-abil-${skill.id}`}
                          name={`skill-abil-${skill.id}`}
                          className="forge-select"
                          value={skill.ability}
                          onChange={(e) => {
                            const nextAbil = e.target.value as AbilityKey;
                            onMutate((draft) => {
                              const target = draft.skills.find(
                                (s) => s.id === skill.id,
                              );
                              if (target) target.ability = nextAbil;
                            });
                          }}
                        >
                          {ABILITY_KEYS.map((key) => (
                            <option key={key} value={key}>
                              {ABILITY_GLOSSARY[key].abbrFr}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="forge-skill-name-line">
                        <span
                          className="forge-prof-marker tabular-nums"
                          aria-hidden="true"
                        >
                          {getProficiencyMarker(skill.proficiency)}
                        </span>
                        <strong>{skill.name}</strong>
                        {skill.originalName && (
                          <span className="original-term">
                            ({skill.originalName})
                          </span>
                        )}
                      </div>
                      <div className="attack-meta forge-skill-meta-row">
                        <span>Basée sur {ABILITY_GLOSSARY[skill.ability].abbrFr}</span>
                        <span className="badge-pill tabular-nums">
                          {formatSignedModifier(abilityMod)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="forge-skill-controls">
                  <div className="field-group">
                    <label htmlFor={`${baseId}-sk-prof-${skill.id}`}>
                      Maîtrise
                    </label>
                    <select
                      id={`${baseId}-sk-prof-${skill.id}`}
                      name={`skill-prof-${skill.id}`}
                      className="forge-select"
                      value={skill.proficiency}
                      onChange={(e) => {
                        const nextProf = e.target.value as ProficiencyLevel;
                        onMutate((draft) => {
                          const target = draft.skills.find(
                            (s) => s.id === skill.id,
                          );
                          if (target) target.proficiency = nextProf;
                        });
                      }}
                    >
                      {PROFICIENCY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-group">
                    <label htmlFor={`${baseId}-sk-flat-${skill.id}`}>
                      Mod. divers
                    </label>
                    <NumberStepper
                      id={`${baseId}-sk-flat-${skill.id}`}
                      name={`skill-flat-${skill.id}`}
                      value={skill.bonusFlat}
                      min={-10}
                      max={20}
                      decrementLabel={`Diminuer le modificateur divers de ${skill.name}`}
                      incrementLabel={`Augmenter le modificateur divers de ${skill.name}`}
                      onChange={(nextFlat) =>
                        onMutate((draft) => {
                          const target = draft.skills.find(
                            (s) => s.id === skill.id,
                          );
                          if (target) target.bonusFlat = Math.trunc(nextFlat);
                        })
                      }
                    />
                  </div>

                  <div
                    className="forge-skill-total-card"
                    aria-label={`Total pour ${skill.name} : ${formatSignedModifier(totalMod)}`}
                  >
                    <span className="forge-skill-total-label">Total</span>
                    <strong className="forge-skill-total-value tabular-nums">
                      {formatSignedModifier(totalMod)}
                    </strong>
                  </div>
                </div>

                {skill.isCustom && (
                  <div className="forge-skill-row-actions">
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() =>
                        onMutate((draft) => {
                          draft.skills = draft.skills.filter(
                            (s) => s.id !== skill.id,
                          );
                        })
                      }
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Bloc 3 : Maîtrises d'outils */}
      <section
        className="grimoire-card forge-card"
        aria-label="Maîtrises d'outils"
      >
        <h2>Maîtrises d&apos;outils</h2>
        <p className="muted-caption">
          Outils d&apos;artisanat, kits techniques ou véhicules nécessitant un jet de réussite (calculé avec la caractéristique associée).
        </p>

        <details className="forge-details">
          <summary id={`${baseId}-custom-tool-title`}>
            Ajouter ou choisir un outil
          </summary>
          <div className="forge-details-body">
            <div className="forge-preset-strip" role="group" aria-label="Outils fréquents">
            {TOOL_PRESETS.filter(
              (preset) =>
                !toolProficiencies.some(
                  (t) =>
                    t.name.trim().toLocaleLowerCase('fr') ===
                    preset.name.toLocaleLowerCase('fr'),
                ),
            ).map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="action-btn"
                onClick={() =>
                  handleAddTool(
                    preset.name,
                    preset.originalName,
                    preset.ability,
                    'proficient',
                    0,
                  )
                }
              >
                + {preset.name} ({ABILITY_GLOSSARY[preset.ability].abbrFr})
              </button>
            ))}
          </div>

          <form
            className="forge-custom-skill-form"
            aria-labelledby={`${baseId}-custom-tool-title`}
            onSubmit={handleAddToolFormSubmit}
          >
            <div className="forge-custom-skill-grid">
              <div className="field-group">
                <label htmlFor={`${baseId}-new-tool-name`}>Nom (FR) *</label>
                <input
                  id={`${baseId}-new-tool-name`}
                  name="toolName"
                  type="text"
                  className="forge-input"
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  placeholder="Ex. Outils de cartographe, Luth..."
                  required
                />
              </div>

              <div className="field-group">
                <label htmlFor={`${baseId}-new-tool-vo`}>
                  Nom VO (optionnel)
                </label>
                <input
                  id={`${baseId}-new-tool-vo`}
                  name="toolVo"
                  type="text"
                  className="forge-input"
                  value={toolOriginalName}
                  onChange={(e) => setToolOriginalName(e.target.value)}
                  placeholder="Ex. Cartographer's Tools"
                />
              </div>

              <div className="field-group">
                <label htmlFor={`${baseId}-new-tool-abil`}>
                  Caractéristique
                </label>
                <select
                  id={`${baseId}-new-tool-abil`}
                  name="toolAbility"
                  className="forge-select"
                  value={toolAbility}
                  onChange={(e) => setToolAbility(e.target.value as AbilityKey)}
                >
                  {ABILITY_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {ABILITY_GLOSSARY[key].abbrFr} ({ABILITY_GLOSSARY[key].name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label htmlFor={`${baseId}-new-tool-prof`}>Maîtrise</label>
                <select
                  id={`${baseId}-new-tool-prof`}
                  name="toolProficiency"
                  className="forge-select"
                  value={toolProficiency}
                  onChange={(e) =>
                    setToolProficiency(e.target.value as ProficiencyLevel)
                  }
                >
                  {PROFICIENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label htmlFor={`${baseId}-new-tool-flat`}>Mod. divers</label>
                <NumberStepper
                  id={`${baseId}-new-tool-flat`}
                  name="toolFlat"
                  value={toolBonusFlat}
                  min={-10}
                  max={20}
                  decrementLabel="Réduire le modificateur divers de l'outil"
                  incrementLabel="Augmenter le modificateur divers de l'outil"
                  onChange={(val) => setToolBonusFlat(Math.trunc(val))}
                />
              </div>
            </div>

              <div>
                <button type="submit" className="action-btn action-btn--primary">
                  Ajouter l&apos;outil
                </button>
              </div>
            </form>
          </div>
        </details>

        {toolProficiencies.length === 0 ? (
          <p className="muted-note">
            Aucun outil maîtrisé configuré pour le moment. Utilisez la section &laquo; Ajouter ou choisir un outil &raquo; ci-dessus.
          </p>
        ) : (
          <div className="forge-skills-list">
            {toolProficiencies.map((tool) => {
              const derivedTool = derived.tools.find((t) => t.id === tool.id);
              const abilityMod = derived.abilityModifiers[tool.ability];
              const totalMod = derivedTool?.modifier ?? 0;
              const profClass =
                tool.proficiency === 'expertise'
                  ? 'forge-skill-row--expertise'
                  : tool.proficiency === 'proficient'
                    ? 'forge-skill-row--proficient'
                    : '';

              return (
                <div
                  key={tool.id}
                  className={`forge-skill-row ${profClass}`}
                >
                  <div className="forge-skill-title">
                    <div className="forge-skill-custom-fields">
                      <div className="field-group">
                        <label htmlFor={`${baseId}-tool-name-${tool.id}`}>
                          Outil
                        </label>
                        <CommittedTextInput
                          id={`${baseId}-tool-name-${tool.id}`}
                          name={`tool-name-${tool.id}`}
                          value={tool.name}
                          required
                          maxLength={60}
                          onCommit={(val) =>
                            onMutate((draft) => {
                              const target = (draft.toolProficiencies ?? []).find(
                                (t) => t.id === tool.id,
                              );
                              if (target) target.name = val.trim() || 'Outil';
                            })
                          }
                        />
                      </div>

                      <div className="field-group">
                        <label htmlFor={`${baseId}-tool-abil-${tool.id}`}>
                          Caractéristique ({formatSignedModifier(abilityMod)})
                        </label>
                        <select
                          id={`${baseId}-tool-abil-${tool.id}`}
                          name={`tool-abil-${tool.id}`}
                          className="forge-select"
                          value={tool.ability}
                          onChange={(e) => {
                            const nextAbil = e.target.value as AbilityKey;
                            onMutate((draft) => {
                              const target = (draft.toolProficiencies ?? []).find(
                                (t) => t.id === tool.id,
                              );
                              if (target) target.ability = nextAbil;
                            });
                          }}
                        >
                          {ABILITY_KEYS.map((key) => (
                            <option key={key} value={key}>
                              {ABILITY_GLOSSARY[key].abbrFr}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="forge-skill-controls">
                    <div className="field-group">
                      <label htmlFor={`${baseId}-tool-prof-${tool.id}`}>
                        Maîtrise
                      </label>
                      <select
                        id={`${baseId}-tool-prof-${tool.id}`}
                        name={`tool-prof-${tool.id}`}
                        className="forge-select"
                        value={tool.proficiency}
                        onChange={(e) => {
                          const nextProf = e.target.value as ProficiencyLevel;
                          onMutate((draft) => {
                            const target = (draft.toolProficiencies ?? []).find(
                              (t) => t.id === tool.id,
                            );
                            if (target) target.proficiency = nextProf;
                          });
                        }}
                      >
                        {PROFICIENCY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field-group">
                      <label htmlFor={`${baseId}-tool-flat-${tool.id}`}>
                        Mod. divers
                      </label>
                      <NumberStepper
                        id={`${baseId}-tool-flat-${tool.id}`}
                        name={`tool-flat-${tool.id}`}
                        value={tool.bonusFlat}
                        min={-10}
                        max={20}
                        decrementLabel={`Diminuer le modificateur divers de ${tool.name}`}
                        incrementLabel={`Augmenter le modificateur divers de ${tool.name}`}
                        onChange={(nextFlat) =>
                          onMutate((draft) => {
                            const target = (draft.toolProficiencies ?? []).find(
                              (t) => t.id === tool.id,
                            );
                            if (target) target.bonusFlat = Math.trunc(nextFlat);
                          })
                        }
                      />
                    </div>

                    <div
                      className="forge-skill-total-card"
                      aria-label={`Total pour ${tool.name} : ${formatSignedModifier(totalMod)}`}
                    >
                      <span className="forge-skill-total-label">Total</span>
                      <strong className="forge-skill-total-value tabular-nums">
                        {formatSignedModifier(totalMod)}
                      </strong>
                    </div>
                  </div>

                  <div className="forge-skill-row-actions">
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() =>
                        onMutate((draft) => {
                          draft.toolProficiencies = (
                            draft.toolProficiencies ?? []
                          ).filter((t) => t.id !== tool.id);
                        })
                      }
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
