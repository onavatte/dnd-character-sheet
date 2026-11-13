import { useId, useState } from 'react';
import type { Draft } from 'immer';
import type {
  CharacterSheetV1,
  DerivedCharacterStats,
  InventoryCategory,
} from '../../engine';
import {
  getInventoryCategoryLabel,
  INVENTORY_CATEGORY_OPTIONS,
} from './forge-constants';
import { CommittedTextInput, NumberStepper } from './ForgeSharedControls';

export interface ForgeInventorySectionProps {
  sheet: CharacterSheetV1;
  derived: DerivedCharacterStats;
  onMutate: (recipe: (draft: Draft<CharacterSheetV1>) => void) => void;
}

type InventoryFilter = 'all' | InventoryCategory;

/**
 * Éditeur de l'inventaire et de la capacité de charge (Forge Tab 4, colonne gauche).
 */
export function ForgeInventorySection({
  sheet,
  derived,
  onMutate,
}: ForgeInventorySectionProps) {
  const baseId = useId();
  const [categoryFilter, setCategoryFilter] = useState<InventoryFilter>('all');
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const handleAddItem = () => {
    const newId = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const defaultCategory: InventoryCategory =
      categoryFilter === 'all' ? 'gear' : categoryFilter;

    onMutate((draft) => {
      draft.inventory.push({
        id: newId,
        category: defaultCategory,
        name: 'Nouvel objet',
        quantity: 1,
        weight: 0.5,
        equipped: false,
        notes: '',
      });
    });

    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(newId);
      return next;
    });
  };

  const handleRemoveItem = (itemId: string) => {
    onMutate((draft) => {
      draft.inventory = draft.inventory.filter((item) => item.id !== itemId);
    });
    setExpandedIds((prev) => {
      if (!prev.has(itemId)) return prev;
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const setExpanded = (itemId: string, isOpen: boolean) => {
    setExpandedIds((prev) => {
      if (prev.has(itemId) === isOpen) return prev;
      const next = new Set(prev);
      if (isOpen) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });
  };

  const filteredItems = sheet.inventory.filter((item) => {
    if (categoryFilter === 'all') return true;
    return (item.category ?? 'gear') === categoryFilter;
  });

  return (
    <section
      className="grimoire-card forge-card"
      aria-labelledby={`${baseId}-inventory-title`}
    >
      <div className="forge-card-header">
        <div>
          <h2 id={`${baseId}-inventory-title`} className="panel-title">
            Inventaire & Équipement
          </h2>
          <p className="muted-caption">
            Objets transportés, poids et statut équipé.
          </p>
        </div>
        <button
          type="button"
          className="action-btn action-btn--primary"
          onClick={handleAddItem}
        >
          + Ajouter un objet
        </button>
      </div>

      <div
        className={
          derived.encumbered
            ? 'forge-capacity-banner forge-capacity-banner--encumbered'
            : 'forge-capacity-banner'
        }
        role="status"
      >
        <div className="tabular-nums">
          <strong>
            Charge : {derived.totalWeight} / {derived.carryingCapacityKg} kg
          </strong>{' '}
          <span className="muted-caption">
            (FOR {sheet.abilities.STR} × 7,5 kg)
          </span>
        </div>
        {derived.encumbered ? (
          <span className="badge-pill badge-pill--alert">
            Surcharge / Encombré
          </span>
        ) : (
          <span className="badge-pill">
            {sheet.inventory.length} objet{sheet.inventory.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div
        className="forge-filter-pills"
        role="group"
        aria-label="Filtrer l'inventaire par catégorie"
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
          Tout ({sheet.inventory.length})
        </button>
        {INVENTORY_CATEGORY_OPTIONS.map((opt) => {
          const count = sheet.inventory.filter(
            (item) => (item.category ?? 'gear') === opt.value,
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

      {filteredItems.length === 0 ? (
        <p className="muted-caption">
          {sheet.inventory.length === 0
            ? 'Votre sac est vide. Utilisez « + Ajouter un objet » pour enregistrer votre équipement.'
            : 'Aucun objet dans cette catégorie.'}
        </p>
      ) : (
        <div className="forge-repeat-list">
          {filteredItems.map((item) => {
            const catLabel = getInventoryCategoryLabel(item.category);
            const itemTotalWeight =
              Math.round(
                Math.max(0, item.quantity) * Math.max(0, item.weight) * 100,
              ) / 100;

            return (
              <article key={item.id} className="forge-entry-card">
                <details
                  className="forge-entry-details"
                  open={expandedIds.has(item.id)}
                  onToggle={(e) => setExpanded(item.id, e.currentTarget.open)}
                >
                  <summary className="forge-entry-summary">
                    <span className="forge-entry-summary-main">
                      <span className="forge-entry-title">
                        <strong>{item.name}</strong>
                        {item.originalName && (
                          <span className="original-term">
                            ({item.originalName})
                          </span>
                        )}
                      </span>
                      <span className="forge-entry-submeta">
                        {catLabel} · {item.weight} kg/u
                        {item.notes ? ` · ${item.notes}` : ''}
                      </span>
                    </span>

                    <span className="forge-entry-badges tabular-nums">
                      <span className="badge-pill">×{item.quantity}</span>
                      <span className="badge-pill">{itemTotalWeight} kg</span>
                      {item.equipped && (
                        <span className="badge-pill badge-pill--active">
                          Équipé
                        </span>
                      )}
                    </span>
                  </summary>

                  <div className="forge-entry-body">
                    <div className="forge-two-cols">
                      <div className="field-group">
                        <label htmlFor={`${baseId}-inv-name-${item.id}`}>
                          Nom (FR) <span aria-hidden="true">*</span>
                        </label>
                        <CommittedTextInput
                          id={`${baseId}-inv-name-${item.id}`}
                          name={`inv-name-${item.id}`}
                          value={item.name}
                          required
                          maxLength={80}
                          onCommit={(nextVal) => {
                            const trimmed = nextVal.trim();
                            if (!trimmed) return;
                            onMutate((draft) => {
                              const target = draft.inventory.find(
                                (i) => i.id === item.id,
                              );
                              if (target) {
                                target.name = trimmed;
                              }
                            });
                          }}
                        />
                      </div>

                      <div className="field-group">
                        <label htmlFor={`${baseId}-inv-orig-${item.id}`}>
                          Nom VO (optionnel)
                        </label>
                        <CommittedTextInput
                          id={`${baseId}-inv-orig-${item.id}`}
                          name={`inv-orig-${item.id}`}
                          value={item.originalName ?? ''}
                          placeholder="ex. Rope, Hempen"
                          maxLength={80}
                          onCommit={(nextVal) => {
                            const trimmed = nextVal.trim();
                            onMutate((draft) => {
                              const target = draft.inventory.find(
                                (i) => i.id === item.id,
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

                    <div className="forge-three-cols">
                      <div className="field-group">
                        <label htmlFor={`${baseId}-inv-cat-${item.id}`}>
                          Catégorie
                        </label>
                        <select
                          id={`${baseId}-inv-cat-${item.id}`}
                          name={`inv-cat-${item.id}`}
                          className="forge-select"
                          value={item.category ?? 'gear'}
                          onChange={(e) => {
                            const nextCat = e.target.value as InventoryCategory;
                            onMutate((draft) => {
                              const target = draft.inventory.find(
                                (i) => i.id === item.id,
                              );
                              if (target) {
                                target.category = nextCat;
                              }
                            });
                          }}
                        >
                          {INVENTORY_CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="field-group">
                        <label htmlFor={`${baseId}-inv-qty-${item.id}`}>
                          Quantité
                        </label>
                        <NumberStepper
                          id={`${baseId}-inv-qty-${item.id}`}
                          name={`inv-qty-${item.id}`}
                          value={item.quantity}
                          min={0}
                          max={9999}
                          step={1}
                          decrementLabel={`Réduire la quantité de ${item.name}`}
                          incrementLabel={`Augmenter la quantité de ${item.name}`}
                          onChange={(nextQty) => {
                            onMutate((draft) => {
                              const target = draft.inventory.find(
                                (i) => i.id === item.id,
                              );
                              if (target) {
                                target.quantity = nextQty;
                              }
                            });
                          }}
                        />
                      </div>

                      <div className="field-group">
                        <label htmlFor={`${baseId}-inv-weight-${item.id}`}>
                          Poids unitaire (kg)
                        </label>
                        <NumberStepper
                          id={`${baseId}-inv-weight-${item.id}`}
                          name={`inv-weight-${item.id}`}
                          value={item.weight}
                          min={0}
                          max={999}
                          step={0.5}
                          decrementLabel={`Réduire le poids de ${item.name}`}
                          incrementLabel={`Augmenter le poids de ${item.name}`}
                          onChange={(nextWeight) => {
                            onMutate((draft) => {
                              const target = draft.inventory.find(
                                (i) => i.id === item.id,
                              );
                              if (target) {
                                target.weight = nextWeight;
                              }
                            });
                          }}
                        />
                      </div>
                    </div>

                    <div className="forge-two-cols">
                      <div className="field-group">
                        <label htmlFor={`${baseId}-inv-notes-${item.id}`}>
                          Notes / Détails
                        </label>
                        <CommittedTextInput
                          id={`${baseId}-inv-notes-${item.id}`}
                          name={`inv-notes-${item.id}`}
                          value={item.notes}
                          placeholder="ex. Accord requis, charges restantes..."
                          maxLength={160}
                          onCommit={(nextVal) => {
                            onMutate((draft) => {
                              const target = draft.inventory.find(
                                (i) => i.id === item.id,
                              );
                              if (target) {
                                target.notes = nextVal.trim();
                              }
                            });
                          }}
                        />
                      </div>

                      <div className="field-group">
                        <span>Port & Accès</span>
                        <label
                          htmlFor={`${baseId}-inv-eq-${item.id}`}
                          className={
                            item.equipped
                              ? 'forge-prep-pill forge-prep-pill--active'
                              : 'forge-prep-pill'
                          }
                        >
                          <input
                            id={`${baseId}-inv-eq-${item.id}`}
                            name={`inv-eq-${item.id}`}
                            type="checkbox"
                            checked={item.equipped}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              onMutate((draft) => {
                                const target = draft.inventory.find(
                                  (i) => i.id === item.id,
                                );
                                if (target) {
                                  target.equipped = checked;
                                }
                              });
                            }}
                          />
                          <span>Équipé / sur soi</span>
                        </label>
                      </div>
                    </div>

                    <div className="forge-item-footer">
                      <span className="muted-caption tabular-nums">
                        {catLabel} · Total : {itemTotalWeight} kg
                      </span>
                      <button
                        type="button"
                        className="action-btn action-btn--danger"
                        onClick={() => handleRemoveItem(item.id)}
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
  );
}
