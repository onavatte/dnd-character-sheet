import { useId, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import type { Draft } from 'immer';
import { formatSenseLabel, getSenseDisplayParts } from '../../engine';
import type {
  CharacterDefenses,
  CharacterSheetV1,
  FeatureCategory,
  FeatureEntry,
  TermDisplayMode,
} from '../../engine';
import {
  CONDITION_IMMUNITY_PRESETS_5E,
  DAMAGE_TYPE_PRESETS_5E,
  FEATURE_CATEGORY_OPTIONS,
  FEATURE_PRESETS_5E,
  getFeatureCategoryLabel,
  SENSE_PRESETS_5E,
} from './forge-constants';
import type { FeaturePreset } from './forge-constants';
import { CommittedTextArea, CommittedTextInput } from './ForgeSharedControls';

export interface ForgeFeaturesAndDefensesTabProps {
  sheet: CharacterSheetV1;
  termMode: TermDisplayMode;
  onMutate: (recipe: (draft: Draft<CharacterSheetV1>) => void) => void;
}

type FeatureFilter = 'all' | FeatureCategory;
type DefenseListKey =
  | 'senses'
  | 'resistances'
  | 'damageImmunities'
  | 'conditionImmunities'
  | 'vulnerabilities';

function ensureDefenses(draft: Draft<CharacterSheetV1>): CharacterDefenses {
  if (!draft.defenses) {
    draft.defenses = {
      senses: [],
      resistances: [],
      damageImmunities: [],
      conditionImmunities: [],
      vulnerabilities: [],
      notes: '',
    };
  }
  return draft.defenses;
}

interface DefenseTagGroupProps {
  legend: string;
  emptyLabel: string;
  inputId: string;
  placeholder: string;
  presets: ReadonlyArray<string>;
  selectedValues: ReadonlyArray<string>;
  formatTagText?: (value: string) => string;
  renderTagContent?: (value: string) => ReactNode;
  normalizeCompareKey?: (value: string) => string;
  onAddValue: (value: string) => void;
  onRemoveValue: (value: string) => void;
}

/**
 * Groupe réutilisable aligné sur "Langues maîtrisées" : puces actives retirables,
 * raccourcis restants (+ ...) et saisie libre.
 */
function DefenseTagGroup({
  legend,
  emptyLabel,
  inputId,
  placeholder,
  presets,
  selectedValues,
  formatTagText,
  renderTagContent,
  normalizeCompareKey,
  onAddValue,
  onRemoveValue,
}: DefenseTagGroupProps) {
  const [customInput, setCustomInput] = useState('');

  const getKey = (raw: string) =>
    normalizeCompareKey
      ? normalizeCompareKey(raw)
      : raw.trim().toLocaleLowerCase('fr');

  const handleSubmitCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    onAddValue(trimmed);
    setCustomInput('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleSubmitCustom();
    }
  };

  const remainingPresets = presets.filter(
    (preset) => !selectedValues.some((val) => getKey(val) === getKey(preset)),
  );

  return (
    <fieldset className="forge-fieldset">
      <legend>{legend}</legend>

      {selectedValues.length === 0 ? (
        <p className="muted-note">{emptyLabel}</p>
      ) : (
        <div className="forge-languages-list">
          {selectedValues.map((val) => {
            const labelText = formatTagText ? formatTagText(val) : val;
            return (
              <span key={val} className="badge-pill forge-language-pill">
                <span>{renderTagContent ? renderTagContent(val) : labelText}</span>
                <button
                  type="button"
                  className="forge-pill-remove"
                  aria-label={`Retirer ${labelText}`}
                  onClick={() => onRemoveValue(val)}
                >
                  x
                </button>
              </span>
            );
          })}
        </div>
      )}

      {remainingPresets.length > 0 && (
        <div className="forge-preset-strip" role="group" aria-label={legend}>
          {remainingPresets.map((preset) => {
            const labelText = formatTagText ? formatTagText(preset) : preset;
            return (
              <button
                key={preset}
                type="button"
                className="action-btn"
                onClick={() => onAddValue(preset)}
              >
                + {labelText}
              </button>
            );
          })}
        </div>
      )}

      <div className="inline-input-row">
        <label htmlFor={inputId} className="visually-hidden">
          Ajouter manuellement ({legend})
        </label>
        <input
          id={inputId}
          name={inputId}
          type="text"
          className="forge-input"
          placeholder={placeholder}
          value={customInput}
          maxLength={60}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="action-btn action-btn--primary"
          onClick={handleSubmitCustom}
          disabled={customInput.trim().length === 0}
        >
          Ajouter
        </button>
      </div>
    </fieldset>
  );
}

/**
 * Onglet 3 de la Forge d'édition : Aptitudes, Traits & Dons (gauche) + Sens & Défenses (droite).
 */
export function ForgeFeaturesAndDefensesTab({
  sheet,
  termMode,
  onMutate,
}: ForgeFeaturesAndDefensesTabProps) {
  const baseId = useId();
  const [categoryFilter, setCategoryFilter] = useState<FeatureFilter>('all');
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const features = sheet.features ?? [];
  const defenses: CharacterDefenses = sheet.defenses ?? {
    senses: [],
    resistances: [],
    damageImmunities: [],
    conditionImmunities: [],
    vulnerabilities: [],
    notes: '',
  };

  const filteredFeatures =
    categoryFilter === 'all'
      ? features
      : features.filter((item) => item.category === categoryFilter);

  const remainingFeaturePresets = FEATURE_PRESETS_5E.filter(
    (preset) =>
      !features.some(
        (item) =>
          item.name.trim().toLocaleLowerCase('fr') ===
          preset.name.toLocaleLowerCase('fr'),
      ),
  );

  const toggleExpanded = (id: string, isOpen: boolean) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (isOpen) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleAddBlankFeature = () => {
    const nextId = `feat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const defaultCategory: FeatureCategory =
      categoryFilter === 'all' ? 'trait' : categoryFilter;
    onMutate((draft) => {
      if (!draft.features) {
        draft.features = [];
      }
      const nextEntry: FeatureEntry = {
        id: nextId,
        category: defaultCategory,
        source: '',
        name: 'Nouvelle aptitude',
        description: '',
      };
      draft.features.unshift(nextEntry);
    });
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(nextId);
      return next;
    });
  };

  const handleAddPresetFeature = (preset: FeaturePreset) => {
    const alreadyExists = features.some(
      (item) =>
        item.name.trim().toLocaleLowerCase('fr') ===
        preset.name.toLocaleLowerCase('fr'),
    );
    if (alreadyExists) return;

    const nextId = `feat-${preset.key}-${Date.now().toString(36)}`;
    onMutate((draft) => {
      if (!draft.features) {
        draft.features = [];
      }
      draft.features.push({
        id: nextId,
        category: preset.category,
        source: preset.source,
        name: preset.name,
        originalName: preset.originalName,
        description: preset.description,
      });
    });
  };

  const handleDeleteFeature = (id: string) => {
    onMutate((draft) => {
      if (!draft.features) return;
      draft.features = draft.features.filter((entry) => entry.id !== id);
    });
  };

  const normalizeSenseCompareKey = (raw: string) =>
    formatSenseLabel(raw, 'fr').toLocaleLowerCase('fr');

  const addDefenseItem = (
    key: DefenseListKey,
    rawValue: string,
    customNormalize?: (val: string) => string,
  ) => {
    const trimmed = rawValue.trim();
    if (!trimmed) return;
    const normalize =
      customNormalize ?? ((val: string) => val.trim().toLocaleLowerCase('fr'));
    onMutate((draft) => {
      const target = ensureDefenses(draft);
      const exists = target[key].some(
        (item) => normalize(item) === normalize(trimmed),
      );
      if (!exists) {
        target[key].push(trimmed);
      }
    });
  };

  const removeDefenseItem = (key: DefenseListKey, value: string) => {
    onMutate((draft) => {
      const target = ensureDefenses(draft);
      target[key] = target[key].filter((item) => item !== value);
    });
  };

  const renderSenseContent = (rawSense: string) => {
    const parts = getSenseDisplayParts(rawSense, termMode);
    return (
      <>
        {parts.primary}
        {parts.secondary ? (
          <>
            {' '}
            <span className="original-term">({parts.secondary})</span>
          </>
        ) : null}
      </>
    );
  };

  return (
    <div className="forge-grid">
      {/* Colonne gauche : Aptitudes, Traits d'espèce, Classe & Dons */}
      <section
        className="grimoire-card forge-card"
        aria-labelledby={`${baseId}-features-heading`}
      >
        <div className="forge-card-header">
          <div>
            <h2 id={`${baseId}-features-heading`} className="panel-title">
              Aptitudes, Traits & Dons ({features.length})
            </h2>
            <p className="muted-caption">
              Ajouts rapides D&D 5e ou saisie libre (espèce, classe, dons,
              historique).
            </p>
          </div>
          <button
            type="button"
            className="action-btn action-btn--primary"
            onClick={handleAddBlankFeature}
          >
            + Ajouter une aptitude
          </button>
        </div>

        {remainingFeaturePresets.length > 0 && (
          <div
            className="forge-preset-strip"
            role="group"
            aria-label="Ajouts rapides d'aptitudes 5e"
          >
            {remainingFeaturePresets.map((preset) => (
              <button
                key={preset.key}
                type="button"
                className="action-btn"
                onClick={() => handleAddPresetFeature(preset)}
              >
                + {preset.name}
              </button>
            ))}
          </div>
        )}

        <div
          className="forge-filter-pills"
          role="group"
          aria-label="Filtrer les aptitudes par catégorie"
        >
          <button
            type="button"
            className={
              categoryFilter === 'all'
                ? 'forge-filter-pill forge-filter-pill--active'
                : 'forge-filter-pill'
            }
            aria-pressed={categoryFilter === 'all'}
            onClick={() => setCategoryFilter('all')}
          >
            Tout ({features.length})
          </button>
          {FEATURE_CATEGORY_OPTIONS.map((opt) => {
            const count = features.filter(
              (item) => item.category === opt.value,
            ).length;
            const active = categoryFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className={
                  active
                    ? 'forge-filter-pill forge-filter-pill--active'
                    : 'forge-filter-pill'
                }
                aria-pressed={active}
                onClick={() => setCategoryFilter(opt.value)}
              >
                {opt.label} ({count})
              </button>
            );
          })}
        </div>

        {filteredFeatures.length === 0 ? (
          <p className="muted-caption">
            Aucune aptitude dans cette catégorie. Utilisez un modèle ci-dessus
            ou cliquez sur « + Ajouter une aptitude ».
          </p>
        ) : (
          <div className="forge-repeat-list">
            {filteredFeatures.map((entry) => {
              const nameId = `${baseId}-feat-name-${entry.id}`;
              const voId = `${baseId}-feat-vo-${entry.id}`;
              const catId = `${baseId}-feat-cat-${entry.id}`;
              const srcId = `${baseId}-feat-src-${entry.id}`;
              const descId = `${baseId}-feat-desc-${entry.id}`;

              return (
                <article key={entry.id} className="forge-entry-card">
                  <details
                    className="forge-entry-details"
                    open={expandedIds.has(entry.id)}
                    onToggle={(e) =>
                      toggleExpanded(entry.id, e.currentTarget.open)
                    }
                  >
                    <summary className="forge-entry-summary">
                      <span className="forge-entry-summary-main">
                        <span className="forge-entry-title">
                          <strong>{entry.name || 'Aptitude sans nom'}</strong>
                          {entry.originalName && (
                            <span className="original-term">
                              ({entry.originalName})
                            </span>
                          )}
                        </span>
                        <span className="forge-entry-submeta">
                          {entry.source || 'Origine non précisée'}
                        </span>
                      </span>

                      <span className="forge-entry-badges">
                        <span className="badge-pill">
                          {getFeatureCategoryLabel(entry.category)}
                        </span>
                      </span>
                    </summary>

                    <div className="forge-entry-body">
                      <div className="forge-two-cols">
                        <div className="field-group">
                          <label htmlFor={nameId}>
                            Nom (FR) <span aria-hidden="true">*</span>
                          </label>
                          <CommittedTextInput
                            id={nameId}
                            name={nameId}
                            value={entry.name}
                            required
                            maxLength={80}
                            placeholder="Ex : Ascendance féerique"
                            onCommit={(nextVal) => {
                              const trimmed = nextVal.trim();
                              if (!trimmed) return;
                              onMutate((draft) => {
                                const target = draft.features?.find(
                                  (f) => f.id === entry.id,
                                );
                                if (target) target.name = trimmed;
                              });
                            }}
                          />
                        </div>

                        <div className="field-group">
                          <label htmlFor={voId}>Nom VO (optionnel)</label>
                          <CommittedTextInput
                            id={voId}
                            name={voId}
                            value={entry.originalName ?? ''}
                            maxLength={80}
                            placeholder="Ex : Fey Ancestry"
                            onCommit={(nextVal) => {
                              const trimmed = nextVal.trim();
                              onMutate((draft) => {
                                const target = draft.features?.find(
                                  (f) => f.id === entry.id,
                                );
                                if (!target) return;
                                if (trimmed) {
                                  target.originalName = trimmed;
                                } else {
                                  delete target.originalName;
                                }
                              });
                            }}
                          />
                        </div>
                      </div>

                      <div className="forge-two-cols">
                        <div className="field-group">
                          <label htmlFor={catId}>Catégorie</label>
                          <select
                            id={catId}
                            name={catId}
                            className="forge-select"
                            value={entry.category}
                            onChange={(e) => {
                              const nextCat = e.target.value as FeatureCategory;
                              onMutate((draft) => {
                                const target = draft.features?.find(
                                  (f) => f.id === entry.id,
                                );
                                if (target) target.category = nextCat;
                              });
                            }}
                          >
                            {FEATURE_CATEGORY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="field-group">
                          <label htmlFor={srcId}>Source / Origine</label>
                          <CommittedTextInput
                            id={srcId}
                            name={srcId}
                            value={entry.source ?? ''}
                            maxLength={60}
                            placeholder="Ex : Elfe des bois, Rôdeur Niv. 3..."
                            onCommit={(nextVal) => {
                              const trimmed = nextVal.trim();
                              onMutate((draft) => {
                                const target = draft.features?.find(
                                  (f) => f.id === entry.id,
                                );
                                if (!target) return;
                                if (trimmed) {
                                  target.source = trimmed;
                                } else {
                                  delete target.source;
                                }
                              });
                            }}
                          />
                        </div>
                      </div>

                      <div className="field-group">
                        <label htmlFor={descId}>
                          Description & effets mécaniques
                        </label>
                        <CommittedTextArea
                          id={descId}
                          name={descId}
                          rows={3}
                          maxLength={800}
                          value={entry.description}
                          placeholder="Détails de règle, avantages aux sauvegardes, portée, usage..."
                          onCommit={(nextVal) => {
                            onMutate((draft) => {
                              const target = draft.features?.find(
                                (f) => f.id === entry.id,
                              );
                              if (target) target.description = nextVal;
                            });
                          }}
                        />
                      </div>

                      <div className="forge-item-footer">
                        <button
                          type="button"
                          className="action-btn action-btn--danger"
                          onClick={() => handleDeleteFeature(entry.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Colonne droite : Sens, Résistances, Immunités & Vulnérabilités */}
      <section
        className="grimoire-card forge-card"
        aria-labelledby={`${baseId}-defenses-heading`}
      >
        <div className="forge-card-header">
          <div>
            <h2 id={`${baseId}-defenses-heading`} className="panel-title">
              Sens, Résistances & Immunités
            </h2>
            <p className="muted-caption">
              Ces éléments s’affichent en accès direct sous la barre d’état dans
              le Cockpit de Partie.
            </p>
          </div>
        </div>

        <div className="forge-repeat-list">
          <DefenseTagGroup
            legend="Sens spéciaux"
            emptyLabel="Aucun sens spécial ajouté. Saisissez-en un ou utilisez les raccourcis ci-dessous."
            inputId={`${baseId}-sense-custom`}
            placeholder={
              termMode === 'en'
                ? 'Ex : Darkvision 90 ft, Keen Smell...'
                : 'Ex : Vision nocturne 27 m, Odorat aiguisé...'
            }
            presets={SENSE_PRESETS_5E}
            selectedValues={defenses.senses}
            formatTagText={(val) => formatSenseLabel(val, termMode)}
            renderTagContent={renderSenseContent}
            normalizeCompareKey={normalizeSenseCompareKey}
            onAddValue={(val) =>
              addDefenseItem('senses', val, normalizeSenseCompareKey)
            }
            onRemoveValue={(val) => removeDefenseItem('senses', val)}
          />

          <DefenseTagGroup
            legend="Résistances aux dégâts (1/2 dégâts)"
            emptyLabel="Aucune résistance aux dégâts renseignée."
            inputId={`${baseId}-res-custom`}
            placeholder="Autre résistance (ex : Radiation, Argent)..."
            presets={DAMAGE_TYPE_PRESETS_5E}
            selectedValues={defenses.resistances}
            onAddValue={(val) => addDefenseItem('resistances', val)}
            onRemoveValue={(val) => removeDefenseItem('resistances', val)}
          />

          <DefenseTagGroup
            legend="Immunités aux dégâts (0 dégât)"
            emptyLabel="Aucune immunité aux dégâts renseignée."
            inputId={`${baseId}-imm-dmg-custom`}
            placeholder="Autre immunité aux dégâts..."
            presets={DAMAGE_TYPE_PRESETS_5E}
            selectedValues={defenses.damageImmunities}
            onAddValue={(val) => addDefenseItem('damageImmunities', val)}
            onRemoveValue={(val) => removeDefenseItem('damageImmunities', val)}
          />

          <DefenseTagGroup
            legend="Immunités aux états & effets"
            emptyLabel="Aucune immunité aux états ou effets renseignée."
            inputId={`${baseId}-imm-cond-custom`}
            placeholder="Autre état ou effet (ex : Vieillissement)..."
            presets={CONDITION_IMMUNITY_PRESETS_5E}
            selectedValues={defenses.conditionImmunities}
            onAddValue={(val) => addDefenseItem('conditionImmunities', val)}
            onRemoveValue={(val) =>
              removeDefenseItem('conditionImmunities', val)
            }
          />

          <DefenseTagGroup
            legend="Vulnérabilités (x2 dégâts)"
            emptyLabel="Aucune vulnérabilité renseignée."
            inputId={`${baseId}-vuln-custom`}
            placeholder="Autre vulnérabilité (ex : Lumière du soleil)..."
            presets={DAMAGE_TYPE_PRESETS_5E}
            selectedValues={defenses.vulnerabilities}
            onAddValue={(val) => addDefenseItem('vulnerabilities', val)}
            onRemoveValue={(val) => removeDefenseItem('vulnerabilities', val)}
          />

          <div className="field-group">
            <label htmlFor={`${baseId}-def-notes`}>
              Particularités & avantages aux sauvegardes
            </label>
            <CommittedTextArea
              id={`${baseId}-def-notes`}
              name={`${baseId}-def-notes`}
              rows={2}
              maxLength={400}
              value={defenses.notes ?? ''}
              placeholder="Ex : Avantage aux JS contre le charme (Ascendance féerique) ou le poison..."
              onCommit={(nextVal) => {
                onMutate((draft) => {
                  const target = ensureDefenses(draft);
                  target.notes = nextVal;
                });
              }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
