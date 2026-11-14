import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Draft } from 'immer';
import {
  ABILITY_GLOSSARY,
  formatSignedModifier,
} from '../../engine';
import type {
  AbilityKey,
  CharacterSheetV1,
  DerivedCharacterStats,
  FeatureCategory,
  InventoryCategory,
  NoteCategory,
  TermDisplayMode,
} from '../../engine';
import type { ActiveRollTarget } from './dialog-utils';
import { CurrencyPurseGrid } from './CurrencyPurseGrid';
import {
  FEATURE_CATEGORY_OPTIONS,
  getFeatureCategoryLabel,
  getInventoryCategoryLabel,
  getNoteCategoryLabel,
  INVENTORY_CATEGORY_OPTIONS,
  NOTE_CATEGORY_OPTIONS,
} from './forge-constants';

type CentralTab = 'combat' | 'spells' | 'inventory';

/**
 * Allège l'affichage du temps d'incantation pour les coûts d'action uniques
 * ("1 action" -> "Action", "1 action bonus" -> "Action bonus") tout en préservant les durées (ex. "10 min").
 */
function formatCastingTimeLabel(castingTime: string): string {
  const trimmed = castingTime.trim();
  const singleActionMatch = /^1\s+(action(?:\s+bonus)?|r[ée]action)$/i.exec(
    trimmed,
  );
  if (singleActionMatch?.[1]) {
    const label = singleActionMatch[1];
    return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  }
  return trimmed;
}

export interface CombatAndResourcesPanelProps {
  sheet: CharacterSheetV1;
  derived: DerivedCharacterStats;
  termMode: TermDisplayMode;
  activeRollTargetId: string;
  renderTerm: (fr: string, en?: string) => ReactNode;
  onSelectRollTarget: (target: ActiveRollTarget) => void;
  onAdjustResource: (resourceId: string, delta: number) => void;
  onAdjustSpellSlotUsed: (level: number, delta: number) => void;
  onAdjustPactSlotUsed: (delta: number) => void;
  onUpdateNotes: (nextNotes: string) => void;
  onMutate: (recipe: (draft: Draft<CharacterSheetV1>) => void) => void;
}

type QuickAddTarget = 'inventory' | 'note';
type CockpitNoteFilter = 'all' | NoteCategory;

export function CombatAndResourcesPanel({
  sheet,
  derived,
  termMode,
  activeRollTargetId,
  renderTerm,
  onSelectRollTarget,
  onAdjustResource,
  onAdjustSpellSlotUsed,
  onAdjustPactSlotUsed,
  onUpdateNotes,
  onMutate,
}: CombatAndResourcesPanelProps) {
  const [activeTab, setActiveTab] = useState<CentralTab>('combat');
  const [quickAddTarget, setQuickAddTarget] =
    useState<QuickAddTarget>('inventory');
  const [quickItemCategory, setQuickItemCategory] =
    useState<InventoryCategory>('treasure');
  const [quickNoteCategory, setQuickNoteCategory] =
    useState<NoteCategory>('loot');
  const [quickLootText, setQuickLootText] = useState('');
  const [noteFilter, setNoteFilter] = useState<CockpitNoteFilter>('all');
  const [featureFilter, setFeatureFilter] = useState<'all' | FeatureCategory>(
    'all',
  );

  const handleToggleItemEquipped = (itemId: string) => {
    onMutate((draft) => {
      const target = draft.inventory.find((item) => item.id === itemId);
      if (target) {
        target.equipped = !target.equipped;
      }
    });
  };

  const handleRemoveInventoryItem = (itemId: string) => {
    onMutate((draft) => {
      draft.inventory = draft.inventory.filter((item) => item.id !== itemId);
    });
  };

  const handleAddQuickLoot = () => {
    const trimmed = quickLootText.trim();
    if (!trimmed) return;

    if (quickAddTarget === 'inventory') {
      onMutate((draft) => {
        draft.inventory.push({
          id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          category: quickItemCategory,
          name: trimmed,
          quantity: 1,
          weight: 0,
          equipped: false,
          notes: '',
        });
      });
    } else {
      onMutate((draft) => {
        if (!draft.noteEntries) {
          draft.noteEntries = [];
        }
        draft.noteEntries.unshift({
          id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: trimmed,
          category: quickNoteCategory,
          content: '',
          createdAt: new Date().toISOString(),
        });
      });
    }

    setQuickLootText('');
  };

  const spellAbilities = Object.entries(derived.spellcastingByAbility) as [
    AbilityKey,
    { saveDC: number; attackBonus: number },
  ][];

  return (
    <section
      className="grimoire-card"
      aria-label="Actions de combat, sorts et inventaire"
    >
      <div
        className="segmented-control"
        role="tablist"
        aria-label="Sections tactiques du personnage"
      >
        <button
          type="button"
          role="tab"
          className="segmented-btn"
          aria-selected={activeTab === 'combat'}
          aria-pressed={activeTab === 'combat'}
          onClick={() => setActiveTab('combat')}
        >
          1. Armes & Ressources
        </button>
        <button
          type="button"
          role="tab"
          className="segmented-btn"
          aria-selected={activeTab === 'spells'}
          aria-pressed={activeTab === 'spells'}
          onClick={() => setActiveTab('spells')}
        >
          2. Sorts & Capacités
        </button>
        <button
          type="button"
          role="tab"
          className="segmented-btn"
          aria-selected={activeTab === 'inventory'}
          aria-pressed={activeTab === 'inventory'}
          onClick={() => setActiveTab('inventory')}
        >
          3. Équipement & Notes
        </button>
      </div>

      {/* ONGLET 1 : ARMES, ATTAQUES & RESSOURCES SUIVIES */}
      {activeTab === 'combat' && (
        <div className="tab-panel-stack">
          <h3>Armes & Attaques</h3>
          <div className="attack-cards-list">
            {derived.attacks.map((atk) => {
              const rawAttack = sheet.attacks.find((a) => a.id === atk.id);
              const linkedAmmo = rawAttack?.ammoResourceId
                ? sheet.resources.find((r) => r.id === rawAttack.ammoResourceId)
                : undefined;

              return (
                <div
                  key={atk.id}
                  className={`attack-card ${
                    activeRollTargetId === atk.id ||
                    activeRollTargetId === `${atk.id}-dmg`
                      ? 'attack-card--selected'
                      : ''
                  }`}
                >
                  <div className="attack-card-header">
                    <div>
                      <strong>{renderTerm(atk.name, atk.originalName)}</strong>
                      <div className="attack-meta">
                        Portée : {atk.range} · Type : {atk.damageType}
                        {atk.critRangeMin < 20
                          ? ` · Crit. ${atk.critRangeMin}-20`
                          : ''}
                        {rawAttack?.notes ? ` · ${rawAttack.notes}` : ''}
                      </div>
                    </div>
                    {linkedAmmo && (
                      <span className="badge-pill tabular-nums">
                        Munitions : {linkedAmmo.current}/{linkedAmmo.max}
                      </span>
                    )}
                  </div>

                  <div className="button-cluster">
                    <button
                      type="button"
                      className="action-btn action-btn--primary tabular-nums"
                      onClick={() => {
                        if (linkedAmmo && linkedAmmo.current > 0) {
                          onAdjustResource(linkedAmmo.id, -1);
                        }
                        onSelectRollTarget({
                          id: atk.id,
                          label: `${atk.name} - Attaque`,
                          ...(atk.originalName !== undefined
                            ? { originalLabel: `${atk.originalName} - Attack` }
                            : {}),
                          category: 'attack',
                          modifier: atk.toHitBonus,
                          damageFormula: atk.damageFormula,
                          damageType: atk.damageType,
                          critThreshold: atk.critRangeMin,
                          initialMode: 'd20',
                        });
                      }}
                    >
                      Toucher 1d20 {formatSignedModifier(atk.toHitBonus)}
                      {linkedAmmo ? ' (-1 mun.)' : ''}
                    </button>

                    <button
                      type="button"
                      className="action-btn tabular-nums"
                      onClick={() =>
                        onSelectRollTarget({
                          id: `${atk.id}-dmg`,
                          label: `${atk.name} - Dégâts`,
                          ...(atk.originalName !== undefined
                            ? { originalLabel: `${atk.originalName} - Damage` }
                            : {}),
                          category: 'damage',
                          modifier: atk.toHitBonus,
                          damageFormula: atk.damageFormula,
                          damageType: atk.damageType,
                          initialMode: 'formula',
                          isCritical: false,
                        })
                      }
                    >
                      Dégâts ({atk.damageFormula})
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <h3>Ressources, Munitions & Capacités Comptées</h3>
          <div className="resources-stack">
            {sheet.resources.map((res) => {
              const recoveryLabel =
                res.recovery === 'short_rest'
                  ? 'Repos Court'
                  : res.recovery === 'long_rest'
                    ? 'Repos Long'
                    : 'Manuel';

              return (
                <div key={res.id} className="resource-row">
                  <div className="resource-info">
                    <strong>{renderTerm(res.name, res.originalName)}</strong>
                    <span className="resource-recovery-badge">
                      Récup. : {recoveryLabel}
                    </span>
                  </div>

                  <div className="resource-controls">
                    {res.max <= 10 && (
                      <div className="pip-strip" aria-hidden="true">
                        {Array.from({ length: res.max }, (_, idx) => {
                          const isFilled = idx < res.current;
                          return (
                            <span
                              key={idx}
                              className={`resource-pip ${
                                isFilled ? 'resource-pip--filled' : ''
                              }`}
                            />
                          );
                        })}
                      </div>
                    )}
                    <span className="tabular-nums resource-counter">
                      {res.current} / {res.max}
                    </span>
                    <button
                      type="button"
                      className="stepper-btn tabular-nums"
                      disabled={res.current <= 0}
                      onClick={() => onAdjustResource(res.id, -1)}
                      aria-label={`Dépenser 1 ${res.name}`}
                    >
                      −
                    </button>
                    <button
                      type="button"
                      className="stepper-btn tabular-nums"
                      disabled={res.current >= res.max}
                      onClick={() => onAdjustResource(res.id, 1)}
                      aria-label={`Récupérer 1 ${res.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ONGLET 2 : SORTS, EMPLACEMENTS & MAGIE DE PACTE */}
      {activeTab === 'spells' && (
        <div className="tab-panel-stack">
          <h3>Caractéristiques d’Incantation</h3>
          {spellAbilities.length === 0 ? (
            <p className="muted-note">Aucune classe lanceuse de sorts active.</p>
          ) : (
            <div className="spell-stats-grid">
              {spellAbilities.map(([abilityKey, stats]) => {
                const meta = ABILITY_GLOSSARY[abilityKey];
                return (
                  <div key={abilityKey} className="stat-preview-row">
                    <span>
                      <strong>
                        {termMode === 'en' ? meta.originalName : meta.name}
                      </strong>
                    </span>
                    <div className="button-cluster">
                      <span className="badge-pill tabular-nums">
                        DD Sauvegarde {stats.saveDC}
                      </span>
                      <button
                        type="button"
                        className="action-btn tabular-nums"
                        onClick={() =>
                          onSelectRollTarget({
                            id: `spell-atk-${abilityKey}`,
                            label: `Attaque de Sort (${meta.abbrFr})`,
                            originalLabel: `Spell Attack (${meta.abbrEn})`,
                            category: 'attack',
                            modifier: stats.attackBonus,
                          })
                        }
                      >
                        Attaque de sort {formatSignedModifier(stats.attackBonus)}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {sheet.spellcasting?.pactSlots && (
            <>
              <h3>Magie de Pacte (Repos Court)</h3>
              <div className="resource-row">
                <div>
                  <strong>
                    Emplacements de Pacte (Niveau{' '}
                    {sheet.spellcasting.pactSlots.level})
                  </strong>
                </div>
                <div className="resource-controls">
                  <span className="tabular-nums resource-counter">
                    Dispo :{' '}
                    {sheet.spellcasting.pactSlots.max -
                      sheet.spellcasting.pactSlots.used}{' '}
                    / {sheet.spellcasting.pactSlots.max}
                  </span>
                  <button
                    type="button"
                    className="stepper-btn tabular-nums"
                    disabled={
                      sheet.spellcasting.pactSlots.used >=
                      sheet.spellcasting.pactSlots.max
                    }
                    onClick={() => onAdjustPactSlotUsed(1)}
                    aria-label="Dépenser un emplacement de pacte"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className="stepper-btn tabular-nums"
                    disabled={sheet.spellcasting.pactSlots.used <= 0}
                    onClick={() => onAdjustPactSlotUsed(-1)}
                    aria-label="Restaurer un emplacement de pacte"
                  >
                    +
                  </button>
                </div>
              </div>
            </>
          )}

          <h3>Emplacements de Sorts (Repos Long)</h3>
          {sheet.spellcasting &&
          Object.keys(sheet.spellcasting.slots).length > 0 ? (
            <div className="resources-stack">
              {Object.entries(sheet.spellcasting.slots).map(([lvlStr, slot]) => {
                const level = Number(lvlStr);
                const available = Math.max(0, slot.max - slot.used);
                return (
                  <div key={level} className="resource-row">
                    <div>
                      <strong>Niveau {level}</strong>
                    </div>
                    <div className="resource-controls">
                      <div className="pip-strip" aria-hidden="true">
                        {Array.from({ length: slot.max }, (_, idx) => (
                          <span
                            key={idx}
                            className={`resource-pip ${
                              idx < available ? 'resource-pip--filled' : ''
                            }`}
                          />
                        ))}
                      </div>
                      <span className="tabular-nums resource-counter">
                        Dispo {available} / {slot.max}
                      </span>
                      <button
                        type="button"
                        className="stepper-btn tabular-nums"
                        disabled={available <= 0}
                        onClick={() => onAdjustSpellSlotUsed(level, 1)}
                        aria-label={`Dépenser un emplacement de sort de niveau ${level}`}
                      >
                        −
                      </button>
                      <button
                        type="button"
                        className="stepper-btn tabular-nums"
                        disabled={slot.used <= 0}
                        onClick={() => onAdjustSpellSlotUsed(level, -1)}
                        aria-label={`Restaurer un emplacement de sort de niveau ${level}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted-note">Aucun emplacement de sort configuré.</p>
          )}

          <h3>Sorts & Capacités Préparés</h3>
          <div className="attack-cards-list">
            {sheet.spellcasting?.abilitiesList.map((spell) => {
              const spellAbilityKey =
                spell.ability ?? sheet.spellcasting?.defaultAbility ?? 'WIS';
              const spellStats = derived.spellcastingByAbility[spellAbilityKey];
              const isSelected =
                activeRollTargetId === spell.id ||
                activeRollTargetId === `${spell.id}-dmg`;
              const isHealing =
                spell.damageType !== undefined &&
                /soin|heal|pv/i.test(spell.damageType);
              const saveGlossary = spell.saveAbility
                ? ABILITY_GLOSSARY[spell.saveAbility]
                : undefined;
              const saveAbbr = saveGlossary
                ? termMode === 'en'
                  ? saveGlossary.abbrEn
                  : saveGlossary.abbrFr
                : undefined;
              const showRollActions =
                (Boolean(spell.hasAttackRoll) && Boolean(spellStats)) ||
                Boolean(spell.damageFormula);

              const triggerSpellDamageRoll = () => {
                const formula = spell.damageFormula;
                if (!formula) return;
                const frSuffix = isHealing ? 'Soins' : 'Dégâts';
                const enSuffix = isHealing ? 'Healing' : 'Damage';

                onSelectRollTarget({
                  id: `${spell.id}-dmg`,
                  label: `${spell.name} - ${frSuffix}`,
                  ...(spell.originalName !== undefined
                    ? { originalLabel: `${spell.originalName} - ${enSuffix}` }
                    : {}),
                  category: 'damage',
                  modifier: spellStats?.attackBonus ?? 0,
                  damageFormula: formula,
                  ...(spell.damageType !== undefined
                    ? { damageType: spell.damageType }
                    : {}),
                  initialMode: 'formula',
                  isCritical: false,
                });
              };

              return (
                <div
                  key={spell.id}
                  className={`attack-card ${
                    isSelected ? 'attack-card--selected' : ''
                  }`}
                >
                  <div className="attack-card-header">
                    <strong>{renderTerm(spell.name, spell.originalName)}</strong>
                    <span className="badge-pill tabular-nums">
                      {spell.level === 0 ? 'Tour de magie' : `Niv. ${spell.level}`}{' '}
                      · {formatCastingTimeLabel(spell.castingTime)}
                    </span>
                  </div>
                  <div className="attack-meta">
                    Portée : {spell.range}
                    {saveAbbr && spellStats
                      ? ` · JS ${saveAbbr} DD ${spellStats.saveDC}`
                      : ''}
                    {spell.critRangeMin !== undefined && spell.critRangeMin < 20
                      ? ` · Crit. ${spell.critRangeMin}-20`
                      : ''}
                    {spell.damageType ? ` · Type : ${spell.damageType}` : ''} -{' '}
                    {spell.description}
                  </div>

                  {showRollActions && (
                    <div className="button-cluster">
                      {spell.hasAttackRoll && spellStats && (
                        <button
                          type="button"
                          className="action-btn action-btn--primary tabular-nums"
                          onClick={() =>
                            onSelectRollTarget({
                              id: spell.id,
                              label: `${spell.name} - Attaque de sort`,
                              ...(spell.originalName !== undefined
                                ? {
                                    originalLabel: `${spell.originalName} - Spell Attack`,
                                  }
                                : {}),
                              category: 'attack',
                              modifier: spellStats.attackBonus,
                              ...(spell.damageFormula !== undefined
                                ? { damageFormula: spell.damageFormula }
                                : {}),
                              ...(spell.damageType !== undefined
                                ? { damageType: spell.damageType }
                                : {}),
                              ...(spell.critRangeMin !== undefined
                                ? { critThreshold: spell.critRangeMin }
                                : {}),
                              initialMode: 'd20',
                            })
                          }
                        >
                          Toucher 1d20{' '}
                          {formatSignedModifier(spellStats.attackBonus)}
                        </button>
                      )}

                      {spell.damageFormula && (
                        <button
                          type="button"
                          className="action-btn tabular-nums"
                          onClick={triggerSpellDamageRoll}
                        >
                          {isHealing ? 'Soins' : 'Dégâts'} ({spell.damageFormula})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Aptitudes, Traits & Dons */}
          <div className="cockpit-features-section">
            <h3>Aptitudes & Traits ({(sheet.features ?? []).length})</h3>

            {(sheet.features ?? []).length > 0 ? (
              <>
                <div
                  className="forge-filter-pills"
                  role="group"
                  aria-label="Filtrer les aptitudes"
                >
                  <button
                    type="button"
                    className={
                      featureFilter === 'all'
                        ? 'forge-filter-pill forge-filter-pill--active'
                        : 'forge-filter-pill'
                    }
                    aria-pressed={featureFilter === 'all'}
                    onClick={() => setFeatureFilter('all')}
                  >
                    Tout ({(sheet.features ?? []).length})
                  </button>
                  {FEATURE_CATEGORY_OPTIONS.map((opt) => {
                    const count = (sheet.features ?? []).filter(
                      (item) => item.category === opt.value,
                    ).length;
                    if (count === 0) return null;
                    const active = featureFilter === opt.value;
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
                        onClick={() => setFeatureFilter(opt.value)}
                      >
                        {opt.label} ({count})
                      </button>
                    );
                  })}
                </div>

                <div className="cockpit-feature-list">
                  {(sheet.features ?? [])
                    .filter(
                      (feat) =>
                        featureFilter === 'all' ||
                        feat.category === featureFilter,
                    )
                    .map((feat) => (
                      <article key={feat.id} className="cockpit-feature-card">
                        <div className="cockpit-feature-header">
                          <strong>
                            {renderTerm(feat.name, feat.originalName)}
                          </strong>
                          <span className="badge-pill">
                            {getFeatureCategoryLabel(feat.category)}
                          </span>
                        </div>
                        {feat.source ? (
                          <div className="cockpit-feature-source">
                            Origine : {feat.source}
                          </div>
                        ) : null}
                        {feat.description ? (
                          <p className="cockpit-feature-desc">
                            {feat.description}
                          </p>
                        ) : null}
                      </article>
                    ))}
                </div>
              </>
            ) : (
              <p className="attack-meta">
                Aucune aptitude renseignée. Ajoutez vos traits d’espèce,
                aptitudes de classe ou dons dans Mode Édition (onglet 3).
              </p>
            )}
          </div>
        </div>
      )}

      {/* ONGLET 3 : ÉQUIPEMENT & NOTES DE TERRAIN / BUTIN (LOOT) */}
      {activeTab === 'inventory' && (
        <div className="tab-panel-stack">
          <div className="inventory-header-row">
            <h3>Bourse & Monnaies</h3>
            <span className="badge-pill badge-pill--active tabular-nums">
              Total : {derived.totalWealthGp} po
            </span>
          </div>

          <CurrencyPurseGrid
            currency={sheet.currency}
            onChangeStandardCoin={(coinKey, nextAmount) => {
              onMutate((draft) => {
                if (!draft.currency) {
                  draft.currency = {
                    pp: 0,
                    gp: 0,
                    ep: 0,
                    sp: 0,
                    cp: 0,
                    custom: [],
                  };
                }
                draft.currency[coinKey] = nextAmount;
              });
            }}
            onChangeCustomCoin={(customId, nextAmount) => {
              onMutate((draft) => {
                const target = draft.currency?.custom?.find(
                  (c) => c.id === customId,
                );
                if (target) {
                  target.amount = nextAmount;
                }
              });
            }}
          />

          <div className="inventory-header-row">
            <h3>Équipement & Inventaire</h3>
            <span
              className={
                derived.encumbered
                  ? 'badge-pill badge-pill--alert tabular-nums'
                  : 'badge-pill tabular-nums'
              }
            >
              Charge : {derived.totalWeight} / {derived.carryingCapacityKg} kg
              {derived.encumbered ? ' (Encombré)' : ''}
            </span>
          </div>

          {sheet.inventory.length === 0 ? (
            <p className="muted-note">
              Votre inventaire est vide. Utilisez « Ajouter à l'inventaire » ci-dessous ou le Mode Édition.
            </p>
          ) : (
            <div className="resources-stack">
              {sheet.inventory.map((item) => {
                const lineWeight =
                  Math.round(
                    Math.max(0, item.quantity) * Math.max(0, item.weight) * 100,
                  ) / 100;
                const categoryLabel = getInventoryCategoryLabel(item.category);
                return (
                  <div key={item.id} className="resource-row cockpit-inventory-row">
                    <div className="cockpit-inventory-main">
                      <strong className="cockpit-inventory-title">
                        {renderTerm(item.name, item.originalName)}
                      </strong>
                      <div className="attack-meta">
                        {categoryLabel}
                        {item.notes ? ` · ${item.notes}` : ''}
                      </div>
                      <div className="cockpit-inventory-weight tabular-nums">
                        <span className="badge-pill">
                          ×{item.quantity} ({lineWeight} kg)
                        </span>
                      </div>
                    </div>
                    <div className="cockpit-inventory-row-actions">
                      <button
                        type="button"
                        className="cockpit-delete-btn"
                        aria-label={`Supprimer ${item.name}`}
                        onClick={() => handleRemoveInventoryItem(item.id)}
                      >
                        ×
                      </button>
                      <button
                        type="button"
                        className="cockpit-equip-btn"
                        aria-pressed={item.equipped}
                        onClick={() => handleToggleItemEquipped(item.id)}
                      >
                        {item.equipped ? 'Équipé' : 'Dans le sac'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <h3>Notes de Terrain & Butin</h3>
          <div className="cockpit-quick-add-box">
            <div
              className="cockpit-quick-mode-tabs"
              role="group"
              aria-label="Destination de l'ajout rapide"
            >
              <button
                type="button"
                className={
                  quickAddTarget === 'inventory'
                    ? 'forge-filter-pill forge-filter-pill--active'
                    : 'forge-filter-pill'
                }
                aria-pressed={quickAddTarget === 'inventory'}
                onClick={() => setQuickAddTarget('inventory')}
              >
                Ajouter à l'inventaire
              </button>
              <button
                type="button"
                className={
                  quickAddTarget === 'note'
                    ? 'forge-filter-pill forge-filter-pill--active'
                    : 'forge-filter-pill'
                }
                aria-pressed={quickAddTarget === 'note'}
                onClick={() => setQuickAddTarget('note')}
              >
                Ajouter au carnet de notes
              </button>
            </div>

            <div className="field-group">
              <label htmlFor="cockpit-quick-loot-input">
                {quickAddTarget === 'inventory'
                  ? 'Nom du butin ou objet trouvé :'
                  : 'Titre de la note ou indice :'}
              </label>
              <div className="inline-input-row">
                <input
                  id="cockpit-quick-loot-input"
                  type="text"
                  value={quickLootText}
                  onChange={(e) => setQuickLootText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddQuickLoot();
                    }
                  }}
                  placeholder={
                    quickAddTarget === 'inventory'
                      ? 'Ex. Potion de soins, Bague en or, Torche...'
                      : 'Ex. Clé du donjon, Trahison du capitaine...'
                  }
                />
                {quickAddTarget === 'inventory' ? (
                  <select
                    aria-label="Catégorie d'objet"
                    className="forge-select"
                    value={quickItemCategory}
                    onChange={(e) =>
                      setQuickItemCategory(e.target.value as InventoryCategory)
                    }
                  >
                    {INVENTORY_CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    aria-label="Catégorie de note"
                    className="forge-select"
                    value={quickNoteCategory}
                    onChange={(e) =>
                      setQuickNoteCategory(e.target.value as NoteCategory)
                    }
                  >
                    {NOTE_CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  className="action-btn action-btn--primary"
                  onClick={handleAddQuickLoot}
                >
                  + Ajouter
                </button>
              </div>
            </div>
          </div>

          {(sheet.noteEntries ?? []).length > 0 && (
            <div className="cockpit-notes-log">
              <div
                className="forge-filter-pills"
                role="group"
                aria-label="Filtrer les notes du carnet"
              >
                <button
                  type="button"
                  className={
                    noteFilter === 'all'
                      ? 'forge-filter-pill forge-filter-pill--active'
                      : 'forge-filter-pill'
                  }
                  aria-pressed={noteFilter === 'all'}
                  onClick={() => setNoteFilter('all')}
                >
                  Tout ({sheet.noteEntries?.length ?? 0})
                </button>
                {NOTE_CATEGORY_OPTIONS.map((opt) => {
                  const entries = (sheet.noteEntries ?? []).filter(
                    (n) => n.category === opt.value,
                  );
                  if (entries.length === 0) return null;
                  const active = noteFilter === opt.value;
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
                      onClick={() => setNoteFilter(opt.value)}
                    >
                      {opt.label} ({entries.length})
                    </button>
                  );
                })}
              </div>

              {(sheet.noteEntries ?? [])
                .filter(
                  (entry) =>
                    noteFilter === 'all' || entry.category === noteFilter,
                )
                .map((entry) => (
                  <article key={entry.id} className="cockpit-note-card">
                    <div className="cockpit-note-meta">
                      <strong>{entry.title}</strong>
                      <span className="badge-pill">
                        {getNoteCategoryLabel(entry.category)}
                      </span>
                    </div>
                    {entry.content.trim() && (
                      <p className="cockpit-note-body">{entry.content}</p>
                    )}
                  </article>
                ))}
            </div>
          )}

          <div className="field-group">
            <label htmlFor="cockpit-notes-textarea">
              Carnet de campagne &amp; notes libres :
            </label>
            <textarea
              id="cockpit-notes-textarea"
              className="grimoire-textarea"
              rows={5}
              value={sheet.notes}
              onChange={(e) => onUpdateNotes(e.target.value)}
              placeholder="Notez ici vos indices, contacts et notes de séance..."
            />
          </div>

          <div className="cockpit-subblock">
            <h3>Background du personnage</h3>
            {sheet.identity.backstory?.trim() ? (
              <p className="cockpit-backstory-box">{sheet.identity.backstory}</p>
            ) : (
              <p className="muted-note">
                Aucun background rédigé (Mode Édition &gt; Identité &amp; Classes).
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
