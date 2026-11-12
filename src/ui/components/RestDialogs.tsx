import { useId, useState } from 'react';
import type { RefObject } from 'react';
import {
  formatSignedModifier,
  HIT_DIE_SIZES,
} from '../../engine';
import type {
  CharacterSheetV1,
  DerivedCharacterStats,
  HitDieSize,
  ShortRestOptions,
} from '../../engine';
import { handleDialogBackdropClick } from './dialog-utils';

export interface RestDialogsProps {
  sheet: CharacterSheetV1;
  derived: DerivedCharacterStats;
  shortRestDialogRef: RefObject<HTMLDialogElement | null>;
  longRestDialogRef: RefObject<HTMLDialogElement | null>;
  onConfirmShortRest: (options: ShortRestOptions) => void;
  onConfirmLongRest: () => Promise<void>;
}

export function RestDialogs({
  sheet,
  derived,
  shortRestDialogRef,
  longRestDialogRef,
  onConfirmShortRest,
  onConfirmLongRest,
}: RestDialogsProps) {
  const shortTitleId = useId();
  const longTitleId = useId();

  const [spentByPool, setSpentByPool] = useState<Record<HitDieSize, number>>({
    6: 0,
    8: 0,
    10: 0,
    12: 0,
  });
  const [healingRolled, setHealingRolled] = useState<number>(0);

  const conMod = derived.abilityModifiers.CON;

  const activePools = HIT_DIE_SIZES.filter(
    (size) => sheet.combat.hitDicePools[size].total > 0,
  );

  const shortRestResources = sheet.resources.filter(
    (r) => r.recovery === 'short_rest',
  );

  const adjustSpent = (size: HitDieSize, delta: number) => {
    const avail = sheet.combat.hitDicePools[size].available;
    setSpentByPool((prev) => {
      const nextVal = Math.min(avail, Math.max(0, prev[size] + delta));
      return { ...prev, [size]: nextVal };
    });
  };

  const handleRollVirtualHitDice = () => {
    let totalHealing = 0;
    for (const size of HIT_DIE_SIZES) {
      const count = spentByPool[size];
      for (let i = 0; i < count; i += 1) {
        const roll = Math.floor(Math.random() * size) + 1;
        totalHealing += Math.max(1, roll + conMod);
      }
    }
    setHealingRolled(totalHealing);
  };

  const handleApplyShortRest = () => {
    onConfirmShortRest({
      hitDiceSpent: spentByPool,
      healingRolled,
    });
    setSpentByPool({ 6: 0, 8: 0, 10: 0, 12: 0 });
    setHealingRolled(0);
    shortRestDialogRef.current?.close();
  };

  const handleApplyLongRest = async () => {
    await onConfirmLongRest();
    longRestDialogRef.current?.close();
  };

  return (
    <>
      {/* Modale native <dialog> : Repos Court (Short Rest) */}
      <dialog
        ref={shortRestDialogRef}
        className="grimoire-dialog"
        aria-labelledby={shortTitleId}
        onClick={handleDialogBackdropClick}
        {...({ closedby: 'any' } as Record<string, string>)}
      >
        <div className="dialog-header">
          <h2 id={shortTitleId}>Repos Court (1 heure)</h2>
          <form method="dialog">
            <button type="submit" className="action-btn" autoFocus>
              Annuler
            </button>
          </form>
        </div>

        <p className="dialog-subtitle">
          Dépensez vos Dés de Vie disponibles (modificateur de CON{' '}
          <strong className="tabular-nums">
            {formatSignedModifier(conMod)}
          </strong>{' '}
          par dé) et rechargez vos capacités de Repos Court.
        </p>

        <div className="field-group">
          <label>1. Sélectionnez les Dés de Vie à dépenser :</label>
          <div className="resources-stack">
            {activePools.map((size) => {
              const pool = sheet.combat.hitDicePools[size];
              const toSpend = spentByPool[size];
              return (
                <div key={size} className="resource-row">
                  <div>
                    <strong>Dés de Vie d{size}</strong>
                    <div className="attack-meta tabular-nums">
                      Disponibles : {pool.available} / {pool.total}
                    </div>
                  </div>
                  <div className="resource-controls">
                    <span className="tabular-nums resource-counter">
                      Dépenser : {toSpend}d{size}
                    </span>
                    <button
                      type="button"
                      className="stepper-btn tabular-nums"
                      disabled={toSpend <= 0}
                      onClick={() => adjustSpent(size, -1)}
                      aria-label={`Retirer un dé de vie d${size}`}
                    >
                      −
                    </button>
                    <button
                      type="button"
                      className="stepper-btn tabular-nums"
                      disabled={toSpend >= pool.available}
                      onClick={() => adjustSpent(size, 1)}
                      aria-label={`Ajouter un dé de vie d${size}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="short-rest-healing-input">
            2. Points de Vie regagnés (saisie physique ou tirage virtuel) :
          </label>
          <div className="inline-input-row">
            <input
              id="short-rest-healing-input"
              type="number"
              min={0}
              max={999}
              value={healingRolled}
              onChange={(e) =>
                setHealingRolled(Math.max(0, Number(e.target.value) || 0))
              }
            />
            <button
              type="button"
              className="action-btn"
              onClick={handleRollVirtualHitDice}
            >
              Lancer virtuellement (+CON)
            </button>
          </div>
        </div>

        {shortRestResources.length > 0 && (
          <div className="stat-preview-row">
            <span>
              <strong>Ressources rechargées :</strong>{' '}
              {shortRestResources.map((r) => r.name).join(', ')}
            </span>
          </div>
        )}

        <div className="dialog-footer-actions">
          <button
            type="button"
            className="action-btn action-btn--primary"
            onClick={handleApplyShortRest}
          >
            Valider le Repos Court (+{healingRolled} PV)
          </button>
        </div>
      </dialog>

      {/* Modale native <dialog> : Repos Long (Long Rest + Auto-Snapshot) */}
      <dialog
        ref={longRestDialogRef}
        className="grimoire-dialog"
        aria-labelledby={longTitleId}
        onClick={handleDialogBackdropClick}
        {...({ closedby: 'any' } as Record<string, string>)}
      >
        <div className="dialog-header">
          <h2 id={longTitleId}>Repos Long (8 heures)</h2>
          <form method="dialog">
            <button type="submit" className="action-btn" autoFocus>
              Annuler
            </button>
          </form>
        </div>

        <p className="dialog-subtitle">
          Un <strong>Snapshot automatique IndexedDB</strong> sera capturé avant
          la réinitialisation afin que vous puissiez annuler ce Repos Long à
          tout moment.
        </p>

        <ul className="dialog-checklist">
          <li>
            Points de Vie restaurés au maximum (
            <strong className="tabular-nums">{sheet.combat.hpMax} PV</strong>)
            et PV temporaires remis à 0.
          </li>
          <li>
            Récupération jusqu’à la moitié de vos Dés de Vie totaux (en
            priorisant les plus gros dés dépensés).
          </li>
          <li>
            Toutes les ressources de Repos Court / Repos Long et tous les
            emplacements de sorts sont rechargés.
          </li>
          <li>Niveau d’épuisement réduit de 1 (si supérieur à 0).</li>
        </ul>

        <div className="dialog-footer-actions">
          <button
            type="button"
            className="action-btn action-btn--primary"
            onClick={() => void handleApplyLongRest()}
          >
            Capturer Snapshot & Appliquer le Repos Long
          </button>
        </div>
      </dialog>
    </>
  );
}
