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
  ProficiencyLevel,
  TermDisplayMode,
} from '../../engine';
import type { ActiveRollTarget } from './dialog-utils';

function getProficiencySymbol(proficiency: ProficiencyLevel): string {
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

      {/* Grille des 6 caractéristiques (clic sur la carte = test de carac) + Jets de Sauvegarde */}
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
              <button
                type="button"
                className="ability-main-btn"
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
                <span className="ability-abbr">{abbr}</span>
                <span className="ability-value-line tabular-nums">
                  <span className="ability-raw-score">{rawScore}</span>{' '}
                  <span className="ability-mod-inline">
                    ({formatSignedModifier(mod)})
                  </span>
                </span>
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
                <span>
                  {save.proficient ? '★ ' : ''}
                  {termMode === 'en' ? 'Save' : 'Sauvegarde'}
                </span>
                <strong>{formatSignedModifier(save.modifier)}</strong>
              </button>
            </div>
          );
        })}
      </div>

      {/* Card pleine largeur : Bonus de Maîtrise / Proficiency Bonus */}
      <div className="proficiency-banner-card">
        <span className="proficiency-banner-label">
          {renderTerm('Bonus de Maîtrise', 'Proficiency Bonus')} :
        </span>
        <strong className="proficiency-banner-value tabular-nums">
          {formatSignedModifier(derived.proficiencyBonus)}
        </strong>
      </div>

      {/* Sous-titre Compétences dans le même style que Armes & Attaques */}
      <h3 className="section-subheading">Compétences</h3>

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
            placeholder="Filtrer FR/EN (Stealth, Discrétion, Athlétisme...)"
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
          const profBadge = getProficiencySymbol(skill.proficiency);

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
                {formatSignedModifier(skill.modifier)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Maîtrises d'outils (cliquables pour lancer le jet de réussite) */}
      <div className="cockpit-subblock">
        <h3>Maîtrises d&apos;outils</h3>
        {derived.tools.length === 0 ? (
          <p className="muted-note">
            Aucun outil maîtrisé renseigné (Mode Édition &gt; Stats &amp; Compétences).
          </p>
        ) : (
          <div
            className="skill-list"
            role="group"
            aria-label="Liste des outils maîtrisés"
          >
            {derived.tools.map((tool) => {
              const abilityMeta = ABILITY_GLOSSARY[tool.ability];
              const profBadge = getProficiencySymbol(tool.proficiency);
              const rollId = `tool-${tool.id}`;

              return (
                <button
                  key={tool.id}
                  type="button"
                  className="skill-btn"
                  aria-pressed={activeRollTargetId === rollId}
                  onClick={() =>
                    onSelectRollTarget({
                      id: rollId,
                      label: tool.name,
                      ...(tool.originalName !== undefined
                        ? { originalLabel: tool.originalName }
                        : {}),
                      category: 'tool',
                      modifier: tool.modifier,
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
                    {renderTerm(tool.name, tool.originalName)}{' '}
                    <span
                      style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
                    >
                      [
                      {termMode === 'en'
                        ? abilityMeta.abbrEn
                        : abilityMeta.abbrFr}
                      ]
                    </span>
                  </span>
                  <span className="tabular-nums" style={{ fontWeight: 700 }}>
                    {formatSignedModifier(tool.modifier)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Langues maîtrisées */}
      <div className="cockpit-subblock">
        <h3>Langues</h3>
        {(sheet.languages ?? []).length === 0 ? (
          <p className="muted-note">
            Aucune langue renseignée (Mode Édition &gt; Identité &amp; Classes).
          </p>
        ) : (
          <div className="languages-pill-list" aria-label="Langues maîtrisées">
            {(sheet.languages ?? []).map((lang) => (
              <span key={lang.id} className="badge-pill">
                {renderTerm(lang.name, lang.originalName)}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
