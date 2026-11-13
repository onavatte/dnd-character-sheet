import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import type { Draft } from 'immer';
import {
  ABILITY_GLOSSARY,
  ABILITY_KEYS,
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
      <div className="forge-grid">
        <section
          className="grimoire-card forge-card"
          aria-label="Scores de caractéristiques et maîtrises de sauvegarde"
        >
          <h2>Caractéristiques & Jets de Sauvegarde</h2>
          <div className="forge-abilities-list">
            {ABILITY_KEYS.map((key) => {
              const glossary = ABILITY_GLOSSARY[key];
              const score = sheet.abilities[key];
              const mod = derived.abilityModifiers[key];
              const isProficientSave = sheet.savingThrowProficiencies[key];
              const saveMod = derived.savingThrows[key].modifier;
              const saveCheckboxId = `${baseId}-save-${key}`;

              return (
                <div key={key} className="forge-ability-row">
                  <div className="forge-ability-header">
                    <label htmlFor={`${baseId}-abil-${key}`}>
                      <strong>{glossary.name}</strong> ({glossary.abbrFr})
                    </label>
                    <span className="badge-pill tabular-nums">
                      Mod. {formatSignedModifier(mod)} · JdS{' '}
                      {formatSignedModifier(saveMod)}
                    </span>
                  </div>

                  <div className="forge-ability-controls">
                    <NumberStepper
                      id={`${baseId}-abil-${key}`}
                      name={`ability-${key}`}
                      value={score}
                      min={1}
                      max={30}
                      decrementLabel={`Diminuer ${glossary.name}`}
                      incrementLabel={`Augmenter ${glossary.name}`}
                      onChange={(nextScore) =>
                        onMutate((draft) => {
                          draft.abilities[key] = Math.trunc(nextScore);
                        })
                      }
                    />
                    <div className="forge-checkbox-inline">
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
                      <label htmlFor={saveCheckboxId}>Maîtrise JdS</label>
                    </div>
                  </div>
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
          <p className="muted-note tabular-nums">
            Aperçu calculé : CA totale {derived.armorClass} · Initiative{' '}
            {formatSignedModifier(derived.initiative)} · Perception passive{' '}
            {derived.passivePerception}
          </p>

          <fieldset className="forge-fieldset">
            <legend>Paramètres de combat de base</legend>
            <div className="forge-two-cols">
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

            <div className="forge-two-cols">
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

            <div className="forge-two-cols">
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
                  Bonus d’Initiative plat
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
        <h2>Compétences (Officielles & Homebrew / Post-Apo)</h2>

        <form
          className="forge-custom-skill-form"
          aria-labelledby={`${baseId}-custom-skill-title`}
          onSubmit={handleAddCustomSkill}
        >
          <h3 id={`${baseId}-custom-skill-title`}>
            + Ajouter une compétence personnalisée
          </h3>
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
                placeholder="Ex. Pilotage, Technologie..."
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
                placeholder="Ex. Piloting, Tech..."
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
              <label htmlFor={`${baseId}-new-skill-flat`}>Bonus plat</label>
              <NumberStepper
                id={`${baseId}-new-skill-flat`}
                name="customSkillFlat"
                value={customBonusFlat}
                min={-10}
                max={20}
                decrementLabel="Réduire bonus plat"
                incrementLabel="Augmenter bonus plat"
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

        <div className="forge-skills-list">
          {sheet.skills.map((skill) => {
            const derivedSkill = derived.skills.find((s) => s.id === skill.id);
            const totalMod = derivedSkill?.modifier ?? 0;

            return (
              <div
                key={skill.id}
                className={`forge-skill-row ${
                  skill.isCustom ? 'forge-skill-row--custom' : ''
                }`}
              >
                <div className="forge-skill-title">
                  {skill.isCustom ? (
                    <div className="forge-two-cols">
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
                          Caractéristique
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
                      <strong>{skill.name}</strong>
                      {skill.originalName && (
                        <span className="original-term">
                          {' '}
                          ({skill.originalName})
                        </span>
                      )}
                      <div className="attack-meta">
                        Basée sur {ABILITY_GLOSSARY[skill.ability].abbrFr}
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
                      Bonus plat
                    </label>
                    <NumberStepper
                      id={`${baseId}-sk-flat-${skill.id}`}
                      name={`skill-flat-${skill.id}`}
                      value={skill.bonusFlat}
                      min={-10}
                      max={20}
                      decrementLabel={`Diminuer bonus de ${skill.name}`}
                      incrementLabel={`Augmenter bonus de ${skill.name}`}
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

                  <span className="badge-pill tabular-nums forge-skill-total">
                    {formatSignedModifier(totalMod)}
                  </span>

                  {skill.isCustom && (
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
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
