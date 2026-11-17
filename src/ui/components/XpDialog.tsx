import { useEffect, useId, useState } from 'react';
import type { FormEvent, RefObject } from 'react';
import { formatXpValue, getNextLevelXpThreshold } from '../../engine';
import { handleDialogBackdropClick } from './dialog-utils';

export interface XpDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  currentXp: number;
  totalLevel: number;
  onAddXp: (delta: number) => void;
  onSetXp: (nextXp: number) => void;
}

export function XpDialog({
  dialogRef,
  currentXp,
  totalLevel,
  onAddXp,
  onSetXp,
}: XpDialogProps) {
  const titleId = useId();
  const addInputId = useId();
  const setInputId = useId();

  const [addDraft, setAddDraft] = useState('');
  const [setDraft, setSetDraft] = useState(String(currentXp));

  useEffect(() => {
    setSetDraft(String(currentXp));
  }, [currentXp]);

  const parsedAdd = Number(addDraft);
  const isAddValid =
    addDraft.trim() !== '' && Number.isFinite(parsedAdd) && Math.trunc(parsedAdd) > 0;

  const parsedSet = Number(setDraft);
  const isSetValid =
    setDraft.trim() !== '' && Number.isFinite(parsedSet) && Math.trunc(parsedSet) >= 0;

  const nextThreshold = getNextLevelXpThreshold(totalLevel);
  const thresholdReached = nextThreshold !== null && currentXp >= nextThreshold;
  const remainingXp =
    nextThreshold !== null ? Math.max(0, nextThreshold - currentXp) : 0;

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isAddValid) return;
    onAddXp(Math.trunc(parsedAdd));
    setAddDraft('');
  };

  const handleSetSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isSetValid) return;
    onSetXp(Math.trunc(parsedSet));
  };

  return (
    <dialog
      ref={dialogRef}
      className="grimoire-dialog"
      aria-labelledby={titleId}
      onClick={handleDialogBackdropClick}
      onClose={() => {
        setAddDraft('');
        setSetDraft(String(currentXp));
      }}
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      <div className="dialog-header">
        <h2 id={titleId}>Points d’Expérience (XP)</h2>
        <form method="dialog">
          <button type="submit" className="action-btn">
            Fermer
          </button>
        </form>
      </div>

      <p className="dialog-subtitle tabular-nums">
        XP actuelle : <strong>{formatXpValue(currentXp)} XP</strong>
        {nextThreshold !== null ? (
          <>
            {' '}
            ·{' '}
            {thresholdReached ? (
              <strong className="xp-threshold-reached">
                Seuil du niveau {totalLevel + 1} atteint ({formatXpValue(nextThreshold)} XP)
              </strong>
            ) : (
              <span>
                Niveau {totalLevel + 1} à {formatXpValue(nextThreshold)} XP (encore{' '}
                {formatXpValue(remainingXp)} XP)
              </span>
            )}
          </>
        ) : (
          <span> · Niveau maximum (20) atteint</span>
        )}
      </p>

      <form className="field-group" onSubmit={handleAddSubmit}>
        <label htmlFor={addInputId}>Ajouter de l’XP</label>
        <div className="inline-input-row">
          <input
            id={addInputId}
            name="xpToAdd"
            type="number"
            min={1}
            step={1}
            className="forge-input tabular-nums"
            placeholder="Ex. 450"
            value={addDraft}
            onChange={(e) => setAddDraft(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className="action-btn action-btn--primary"
            disabled={!isAddValid}
          >
            Ajouter
          </button>
        </div>
      </form>

      <form className="field-group" onSubmit={handleSetSubmit}>
        <label htmlFor={setInputId}>Définir le total d’XP</label>
        <div className="inline-input-row">
          <input
            id={setInputId}
            name="xpTotal"
            type="number"
            min={0}
            step={1}
            className="forge-input tabular-nums"
            value={setDraft}
            onChange={(e) => setSetDraft(e.target.value)}
          />
          <button
            type="submit"
            className="action-btn"
            disabled={!isSetValid}
          >
            Définir
          </button>
        </div>
      </form>
    </dialog>
  );
}
