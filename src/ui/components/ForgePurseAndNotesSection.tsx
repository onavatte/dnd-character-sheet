import { useId, useState } from 'react';
import type { Draft } from 'immer';
import type {
  CharacterSheetV1,
  CurrencyPurse,
  DerivedCharacterStats,
  NoteCategory,
} from '../../engine';
import {
  getNoteCategoryLabel,
  NOTE_CATEGORY_OPTIONS,
} from './forge-constants';
import { CurrencyPurseGrid } from './CurrencyPurseGrid';
import {
  CommittedTextArea,
  CommittedTextInput,
} from './ForgeSharedControls';

export interface ForgePurseAndNotesSectionProps {
  sheet: CharacterSheetV1;
  derived: DerivedCharacterStats;
  onMutate: (recipe: (draft: Draft<CharacterSheetV1>) => void) => void;
}

type NoteFilter = 'all' | NoteCategory;

function ensurePurse(draft: Draft<CharacterSheetV1>): CurrencyPurse {
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
  return draft.currency;
}

/**
 * Éditeur de la bourse (D&D 5e + espèces personnalisées) et des notes catégorisées
 * (Forge Tab 4, colonne droite).
 */
export function ForgePurseAndNotesSection({
  sheet,
  derived,
  onMutate,
}: ForgePurseAndNotesSectionProps) {
  const baseId = useId();
  const [noteFilter, setNoteFilter] = useState<NoteFilter>('all');
  const [editingCurrencyId, setEditingCurrencyId] = useState<string | null>(
    null,
  );
  const [expandedNoteIds, setExpandedNoteIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const purse: CurrencyPurse = sheet.currency ?? {
    pp: 0,
    gp: 0,
    ep: 0,
    sp: 0,
    cp: 0,
    custom: [],
  };
  const customCurrencies = purse.custom ?? [];
  const editingCustomCurrency = customCurrencies.find(
    (entry) => entry.id === editingCurrencyId,
  );
  const noteEntries = sheet.noteEntries ?? [];

  const handleAddCustomCurrency = () => {
    const newId = `cur-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    onMutate((draft) => {
      const targetPurse = ensurePurse(draft);
      if (!targetPurse.custom) {
        targetPurse.custom = [];
      }
      targetPurse.custom.push({
        id: newId,
        name: 'Nouvelle espèce',
        amount: 0,
      });
    });
    setEditingCurrencyId(newId);
  };

  const handleRemoveCustomCurrency = (currencyId: string) => {
    onMutate((draft) => {
      const targetPurse = ensurePurse(draft);
      targetPurse.custom = (targetPurse.custom ?? []).filter(
        (entry) => entry.id !== currencyId,
      );
    });
    setEditingCurrencyId((prev) => (prev === currencyId ? null : prev));
  };

  const handleAddNote = () => {
    const newId = `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const defaultCat: NoteCategory =
      noteFilter === 'all' ? 'loot' : noteFilter;
    onMutate((draft) => {
      if (!draft.noteEntries) {
        draft.noteEntries = [];
      }
      draft.noteEntries.unshift({
        id: newId,
        title: 'Nouvelle note',
        category: defaultCat,
        content: '',
        createdAt: new Date().toISOString(),
      });
    });
    setExpandedNoteIds((prev) => {
      const next = new Set(prev);
      next.add(newId);
      return next;
    });
  };

  const handleRemoveNote = (noteId: string) => {
    onMutate((draft) => {
      draft.noteEntries = (draft.noteEntries ?? []).filter(
        (entry) => entry.id !== noteId,
      );
    });
    setExpandedNoteIds((prev) => {
      if (!prev.has(noteId)) return prev;
      const next = new Set(prev);
      next.delete(noteId);
      return next;
    });
  };

  const setNoteExpanded = (noteId: string, isOpen: boolean) => {
    setExpandedNoteIds((prev) => {
      if (prev.has(noteId) === isOpen) return prev;
      const next = new Set(prev);
      if (isOpen) {
        next.add(noteId);
      } else {
        next.delete(noteId);
      }
      return next;
    });
  };

  const filteredNotes = noteEntries.filter((entry) => {
    if (noteFilter === 'all') return true;
    return entry.category === noteFilter;
  });

  return (
    <div className="forge-column-stack">
      {/* Carte Bourse & Monnaies */}
      <section
        className="grimoire-card forge-card"
        aria-labelledby={`${baseId}-purse-title`}
      >
        <div className="forge-card-header">
          <div>
            <h2 id={`${baseId}-purse-title`} className="panel-title">
              Bourse & Monnaies
            </h2>
            <p className="muted-caption">
              Pièces D&amp;D 5e et espèces personnalisées (cliquez sur une espèce ajoutée pour l'éditer).
            </p>
          </div>
          <button
            type="button"
            className="action-btn action-btn--primary"
            onClick={handleAddCustomCurrency}
          >
            + Ajouter une espèce
          </button>
        </div>

        <div className="forge-purse-total-row">
          <span className="badge-pill badge-pill--active tabular-nums">
            Total : {derived.totalWealthGp} po
          </span>
        </div>

        <CurrencyPurseGrid
          currency={sheet.currency}
          editingCustomId={editingCustomCurrency?.id ?? null}
          onSelectCustomCurrency={setEditingCurrencyId}
          onChangeStandardCoin={(coinKey, nextAmount) => {
            onMutate((draft) => {
              const targetPurse = ensurePurse(draft);
              targetPurse[coinKey] = nextAmount;
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

        {editingCustomCurrency && (
          <div
            className="forge-currency-editor"
            role="region"
            aria-label={`Édition de l'espèce ${editingCustomCurrency.name}`}
          >
            <div className="forge-subpanel-header">
              <h3 className="forge-subpanel-title">
                Éditer l'espèce : {editingCustomCurrency.name}
              </h3>
              <button
                type="button"
                className="action-btn"
                onClick={() => setEditingCurrencyId(null)}
              >
                Fermer
              </button>
            </div>

            <div className="forge-two-cols">
              <div className="field-group">
                <label
                  htmlFor={`${baseId}-cur-name-${editingCustomCurrency.id}`}
                >
                  Nom de l'espèce <span aria-hidden="true">*</span>
                </label>
                <CommittedTextInput
                  id={`${baseId}-cur-name-${editingCustomCurrency.id}`}
                  name={`cur-name-${editingCustomCurrency.id}`}
                  value={editingCustomCurrency.name}
                  required
                  maxLength={50}
                  onCommit={(nextVal) => {
                    const trimmed = nextVal.trim();
                    if (!trimmed) return;
                    onMutate((draft) => {
                      const target = draft.currency?.custom?.find(
                        (c) => c.id === editingCustomCurrency.id,
                      );
                      if (target) {
                        target.name = trimmed;
                      }
                    });
                  }}
                />
              </div>

              <div className="field-group">
                <label
                  htmlFor={`${baseId}-cur-rate-${editingCustomCurrency.id}`}
                >
                  Valeur en po (optionnel)
                </label>
                <CommittedTextInput
                  id={`${baseId}-cur-rate-${editingCustomCurrency.id}`}
                  name={`cur-rate-${editingCustomCurrency.id}`}
                  value={
                    editingCustomCurrency.gpEquivalent !== undefined
                      ? String(editingCustomCurrency.gpEquivalent)
                      : ''
                  }
                  placeholder="ex. 10 ou 0.5"
                  maxLength={12}
                  onCommit={(nextVal) => {
                    const trimmed = nextVal.trim().replace(',', '.');
                    onMutate((draft) => {
                      const target = draft.currency?.custom?.find(
                        (c) => c.id === editingCustomCurrency.id,
                      );
                      if (!target) return;
                      if (!trimmed) {
                        delete target.gpEquivalent;
                        return;
                      }
                      const parsed = Number(trimmed);
                      if (Number.isFinite(parsed) && parsed >= 0) {
                        target.gpEquivalent = Math.round(parsed * 100) / 100;
                      }
                    });
                  }}
                />
              </div>
            </div>

            <div className="forge-item-footer">
              <span className="muted-caption tabular-nums">
                {editingCustomCurrency.gpEquivalent !== undefined
                  ? `Sous-total : ${Math.round(editingCustomCurrency.amount * editingCustomCurrency.gpEquivalent * 100) / 100} po`
                  : 'Suivi quantitatif uniquement'}
              </span>
              <button
                type="button"
                className="action-btn action-btn--danger"
                onClick={() =>
                  handleRemoveCustomCurrency(editingCustomCurrency.id)
                }
              >
                Supprimer
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Carte Carnet & Notes */}
      <section
        className="grimoire-card forge-card"
        aria-labelledby={`${baseId}-notes-title`}
      >
        <div className="forge-card-header">
          <div>
            <h2 id={`${baseId}-notes-title`} className="panel-title">
              Carnet de Notes
            </h2>
            <p className="muted-caption">
              Entrées classées (quêtes, PNJ, lieux, butin) et mémo libre.
            </p>
          </div>
          <button
            type="button"
            className="action-btn action-btn--primary"
            onClick={handleAddNote}
          >
            + Ajouter une note
          </button>
        </div>

        <div
          className="forge-filter-pills"
          role="group"
          aria-label="Filtrer les notes par catégorie"
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
            Tout ({noteEntries.length})
          </button>
          {NOTE_CATEGORY_OPTIONS.map((opt) => {
            const count = noteEntries.filter(
              (entry) => entry.category === opt.value,
            ).length;
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
                {opt.label} ({count})
              </button>
            );
          })}
        </div>

        {filteredNotes.length === 0 ? (
          <p className="muted-caption">
            {noteEntries.length === 0
              ? 'Aucune note structurée. Ajoutez des fiches PNJ, quêtes ou indices.'
              : 'Aucune note dans cette catégorie.'}
          </p>
        ) : (
          <div className="forge-repeat-list">
            {filteredNotes.map((entry) => {
              const catLabel = getNoteCategoryLabel(entry.category);
              return (
                <article key={entry.id} className="forge-entry-card">
                  <details
                    className="forge-entry-details"
                    open={expandedNoteIds.has(entry.id)}
                    onToggle={(e) =>
                      setNoteExpanded(entry.id, e.currentTarget.open)
                    }
                  >
                    <summary className="forge-entry-summary">
                      <span className="forge-entry-summary-main">
                        <span className="forge-entry-title">
                          <strong>{entry.title}</strong>
                        </span>
                        <span className="forge-entry-submeta">
                          {entry.content
                            ? entry.content.slice(0, 72) +
                              (entry.content.length > 72 ? '...' : '')
                            : 'Contenu vide'}
                        </span>
                      </span>
                      <span className="forge-entry-badges">
                        <span className="badge-pill">{catLabel}</span>
                      </span>
                    </summary>

                    <div className="forge-entry-body">
                      <div className="forge-two-cols">
                        <div className="field-group">
                          <label htmlFor={`${baseId}-note-title-${entry.id}`}>
                            Titre <span aria-hidden="true">*</span>
                          </label>
                          <CommittedTextInput
                            id={`${baseId}-note-title-${entry.id}`}
                            name={`note-title-${entry.id}`}
                            value={entry.title}
                            required
                            maxLength={80}
                            onCommit={(nextVal) => {
                              const trimmed = nextVal.trim();
                              if (!trimmed) return;
                              onMutate((draft) => {
                                const target = draft.noteEntries?.find(
                                  (n) => n.id === entry.id,
                                );
                                if (target) {
                                  target.title = trimmed;
                                }
                              });
                            }}
                          />
                        </div>

                        <div className="field-group">
                          <label htmlFor={`${baseId}-note-cat-${entry.id}`}>
                            Catégorie
                          </label>
                          <select
                            id={`${baseId}-note-cat-${entry.id}`}
                            name={`note-cat-${entry.id}`}
                            className="forge-select"
                            value={entry.category}
                            onChange={(e) => {
                              const nextCat = e.target.value as NoteCategory;
                              onMutate((draft) => {
                                const target = draft.noteEntries?.find(
                                  (n) => n.id === entry.id,
                                );
                                if (target) {
                                  target.category = nextCat;
                                }
                              });
                            }}
                          >
                            {NOTE_CATEGORY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="field-group">
                        <label htmlFor={`${baseId}-note-body-${entry.id}`}>
                          Contenu
                        </label>
                        <CommittedTextArea
                          id={`${baseId}-note-body-${entry.id}`}
                          name={`note-body-${entry.id}`}
                          value={entry.content}
                          rows={3}
                          placeholder="Détails de quête, indice, dialogue ou butin..."
                          onCommit={(nextVal) => {
                            onMutate((draft) => {
                              const target = draft.noteEntries?.find(
                                (n) => n.id === entry.id,
                              );
                              if (target) {
                                target.content = nextVal;
                              }
                            });
                          }}
                        />
                      </div>

                      <div className="forge-item-footer">
                        <span className="muted-caption">{catLabel}</span>
                        <button
                          type="button"
                          className="action-btn action-btn--danger"
                          onClick={() => handleRemoveNote(entry.id)}
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

        <div className="forge-subpanel">
          <div className="field-group">
            <label htmlFor={`${baseId}-free-notes`}>
              Notes libres de campagne
            </label>
            <CommittedTextArea
              id={`${baseId}-free-notes`}
              name="free-notes"
              value={sheet.notes}
              rows={4}
              placeholder="Mémo de séance, objectifs en cours, journal rapide..."
              onCommit={(nextVal) => {
                onMutate((draft) => {
                  draft.notes = nextVal;
                });
              }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
