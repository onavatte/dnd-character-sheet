import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  ABILITY_GLOSSARY,
  ABILITY_KEYS,
  formatSignedModifier,
  matchesBilingualSearch,
} from '../../engine';
import type {
  CharacterSheetV1,
  DerivedCharacterStats,
  TermDisplayMode,
} from '../../engine';
import type { ActiveRollTarget } from './dialog-utils';

export interface AbilitiesAndSkillsPanelProps {
  sheet: CharacterSheetV1;
  derived: DerivedCharacterStats;
  termMode: TermDisplayMode;
  activeRollTargetId: string;
  renderTerm: (fr: string, en?: string) => ReactNode;
  onSelectRollTarget: (target: ActiveRollTarget) => void;
}

export function AbilitiesAndSkillsPanel({
  sheet,
  derived,
  termMode,
  activeRollTargetId,
  renderTerm,
  onSelectRollTarget,
}: AbilitiesAndSkillsPanelProps) {
  const [skillQuery, setSkillQuery] = useState('');
  const [onlyProficient, setOnlyProficient] = useState(false);

  const filteredSkills = derived.skills.filter((skill) => {
    if (onlyProficient && skill.proficiency === 'none') {
      return false;
    }
    return matchesBilingualSearch(skill, skillQuery);
  });

  return (
    <section
      className="grimoire-card"
      aria-labelledby="cockpit-abilities-title"
    >
      <h2 id="cockpit-abilities-title">
        Caractéristiques, Sauvegardes & Compétences
      </h2>

      {/* Grille des 6 caractéristiques + Jets de Sauvegarde */}
      <div
        className="abilities-grid"
        role="group"
        aria-label="Scores de caractéristiques et jets de sauvegarde"
      >
        {ABILITY_KEYS.map((key) => {
          const meta = ABILITY_GLOSSARY[key];
          const rawScore = sheet.abilities[key];
          const mod = derived.abilityModifiers[key];
          const save = derived.savingThrows[key];
          const abbr = termMode === 'en' ? meta.abbrEn : meta.abbrFr;
          const abilityTargetId = `ability-${key}`;
          const saveTargetId = `save-${key}`;

          return (
            <div key={key} className="ability-card">
              <div className="ability-card-header">
                <span className="ability-abbr">{abbr}</span>
                <span className="ability-score tabular-nums">
                  Score {rawScore}
                </span>
              </div>

              <button
                type="button"
                className="ability-roll-btn tabular-nums"
                aria-pressed={activeRollTargetId === abilityTargetId}
                onClick={() =>
                  onSelectRollTarget({
                    id: abilityTargetId,
                    label: `Test de ${meta.name}`,
                    originalLabel: `${meta.originalName} Check`,
                    category: 'ability',
                    modifier: mod,
                  })
                }
                title={`Tester ${meta.name} (${formatSignedModifier(mod)})`}
              >
                Test {formatSignedModifier(mod)}
              </button>

              <button
                type="button"
                className="ability-save-btn tabular-nums"
                aria-pressed={activeRollTargetId === saveTargetId}
                onClick={() =>
                  onSelectRollTarget({
                    id: saveTargetId,
                    label: `Sauvegarde ${meta.name}`,
                    originalLabel: `${meta.originalName} Save`,
                    category: 'save',
                    modifier: save.modifier,
                  })
                }
                title={`Jet de sauvegarde de ${meta.name}`}
              >
                <span>{save.proficient ? '★ Sauv.' : '· Sauv.'}</span>
                <strong>{formatSignedModifier(save.modifier)}</strong>
              </button>
            </div>
          );
        })}
      </div>

      {/* Filtres de compétences */}
      <div className="skills-filter-toolbar">
        <div
          className="segmented-control"
          role="group"
          aria-label="Filtre de maîtrise des compétences"
        >
          <button
            type="button"
            className="segmented-btn"
            aria-pressed={!onlyProficient}
            onClick={() => setOnlyProficient(false)}
          >
            Toutes ({derived.skills.length})
          </button>
          <button
            type="button"
            className="segmented-btn"
            aria-pressed={onlyProficient}
            onClick={() => setOnlyProficient(true)}
          >
            Maîtrisées ★ (
            {derived.skills.filter((s) => s.proficiency !== 'none').length})
          </button>
        </div>

        <search className="skills-search-box">
          <input
            id="cockpit-skill-search"
            name="skill-search"
            type="search"
            aria-label="Rechercher une compétence en français ou en anglais"
            value={skillQuery}
            onChange={(e) => setSkillQuery(e.target.value)}
            placeholder="Filtrer FR/EN (Stealth, Discrétion, Hacking...)"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </search>
      </div>

      {/* Liste tactile des compétences */}
      <div
        className="skill-list"
        role="group"
        aria-label="Liste des compétences"
      >
        {filteredSkills.map((skill) => {
          const abilityMeta = ABILITY_GLOSSARY[skill.ability];
          const profBadge =
            skill.proficiency === 'expertise'
              ? '★★'
              : skill.proficiency === 'proficient'
                ? '★'
                : skill.proficiency === 'half'
                  ? '½'
                  : '·';

          return (
            <button
              key={skill.id}
              type="button"
              className="skill-btn"
              aria-pressed={activeRollTargetId === skill.id}
              onClick={() =>
                onSelectRollTarget({
                  id: skill.id,
                  label: skill.name,
                  ...(skill.originalName !== undefined
                    ? { originalLabel: skill.originalName }
                    : {}),
                  category: 'skill',
                  modifier: skill.modifier,
                })
              }
            >
              <span>
                <strong
                  className="tabular-nums"
                  style={{ marginRight: '0.5rem' }}
                >
                  {profBadge}
                </strong>
                {renderTerm(skill.name, skill.originalName)}{' '}
                <span
                  style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
                >
                  [
                  {termMode === 'en'
                    ? abilityMeta.abbrEn
                    : abilityMeta.abbrFr}
                  {skill.isCustom ? ' · Homebrew' : ''}]
                </span>
              </span>
              <span className="tabular-nums" style={{ fontWeight: 700 }}>
                {formatSignedModifier(skill.modifier)}{' '}
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 400,
                    color: 'var(--text-muted)',
                  }}
                >
                  (P.{skill.passive})
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
