import { useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import {
  CANONICAL_CONDITIONS_5E,
  formatSignedModifier,
  getSenseDisplayParts,
  metersToFeet,
} from '../../engine';
import type {
  CharacterSheetV1,
  DerivedCharacterStats,
  HitDieSize,
  TermDisplayMode,
} from '../../engine';
import { HIT_DIE_SIZES } from '../../engine';
import { handleDialogBackdropClick } from './dialog-utils';
import type { ActiveRollTarget } from './dialog-utils';

export interface VitalityBannerProps {
  sheet: CharacterSheetV1;
  derived: DerivedCharacterStats;
  termMode: TermDisplayMode;
  renderTerm: (fr: string, en?: string) => ReactNode;
  onSelectRollTarget: (target: ActiveRollTarget) => void;
  onDamage: (amount: number) => void;
  onHeal: (amount: number) => void;
  onTempHp: (amount: number, overwrite?: boolean) => void;
  onToggleCondition: (conditionId: string) => void;
  onSetExhaustion: (level: 0 | 1 | 2 | 3 | 4 | 5 | 6) => void;
  onSetDeathSaves: (successes: number, failures: number) => void;
  onOpenShortRest: () => void;
  onOpenLongRest: () => void;
}

export function VitalityBanner({
  sheet,
  derived,
  termMode,
  renderTerm,
  onSelectRollTarget,
  onDamage,
  onHeal,
  onTempHp,
  onToggleCondition,
  onSetExhaustion,
  onSetDeathSaves,
  onOpenShortRest,
  onOpenLongRest,
}: VitalityBannerProps) {
  const hpDialogRef = useRef<HTMLDialogElement>(null);
  const condDialogRef = useRef<HTMLDialogElement>(null);
  const hpDialogTitleId = useId();
  const condDialogTitleId = useId();

  const [hpAmountDraft, setHpAmountDraft] = useState<string>('');

  const parsedHpAmount =
    hpAmountDraft.length > 0 ? Math.min(999, Number(hpAmountDraft)) : 0;
  const isHpAmountValid = Number.isInteger(parsedHpAmount) && parsedHpAmount > 0;

  const hpRatio =
    sheet.combat.hpMax > 0 ? sheet.combat.hpCurrent / sheet.combat.hpMax : 0;
  const hpColorClass =
    hpRatio <= 0.25
      ? 'vital-value--hp-crit'
      : hpRatio <= 0.5
        ? 'vital-value--hp-warn'
        : 'vital-value--hp-ok';

  const activePools = HIT_DIE_SIZES.filter(
    (size: HitDieSize) => sheet.combat.hitDicePools[size].total > 0,
  );

  const appendHpDigit = (digit: string) => {
    setHpAmountDraft((prev) => {
      if (prev.length >= 3) return prev;
      if (prev === '' && digit === '0') return '';
      return prev + digit;
    });
  };

  const backspaceHpDigit = () => {
    setHpAmountDraft((prev) => prev.slice(0, -1));
  };

  const handleHpDialogKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      appendHpDigit(event.key);
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      backspaceHpDigit();
      return;
    }
    if (event.key === 'Delete' || event.key === 'c' || event.key === 'C') {
      event.preventDefault();
      setHpAmountDraft('');
    }
  };

  const openHpModal = () => {
    setHpAmountDraft('');
    hpDialogRef.current?.showModal();
  };

  const applyAndCloseHpModal = (action: 'damage' | 'heal' | 'temp') => {
    if (isHpAmountValid) {
      if (action === 'damage') onDamage(parsedHpAmount);
      if (action === 'heal') onHeal(parsedHpAmount);
      if (action === 'temp') onTempHp(parsedHpAmount);
    }
    hpDialogRef.current?.close();
  };

  return (
    <section
      className="cockpit-vital-banner"
      aria-label="État vital, défense et repos du personnage"
    >
      <div className="vitals-strip">
        {/* Bloc Points de Vie cliquable ouvrant la modale de Dégâts / Soins */}
        <button
          type="button"
          className="vital-tile vital-tile--interactive"
          onClick={openHpModal}
          title="Toucher pour appliquer des Dégâts, des Soins ou des PV Temporaires"
        >
          <span className="vital-label">Points de Vie (Toucher)</span>
          <span className={`vital-value tabular-nums ${hpColorClass}`}>
            {sheet.combat.hpCurrent} / {sheet.combat.hpMax}
          </span>
          <div className="hp-meter" aria-hidden="true">
            <div
              className={`hp-meter-fill ${hpColorClass}`}
              style={{ width: `${Math.min(100, Math.max(0, hpRatio * 100))}%` }}
            />
          </div>
        </button>

        {/* PV Temporaires */}
        <button
          type="button"
          className="vital-tile vital-tile--interactive"
          onClick={openHpModal}
          title="Toucher pour gérer les PV Temporaires"
        >
          <span className="vital-label">PV Temporaires</span>
          <span className="vital-value vital-value--arcane tabular-nums">
            +{sheet.combat.hpTemp}
          </span>
          <span className="vital-subtext">Bouclier absorbant</span>
        </button>

        {/* Classe d'Armure */}
        <div className="vital-tile">
          <span className="vital-label">Classe d’Armure</span>
          <span className="vital-value tabular-nums">{derived.armorClass}</span>
          <span className="vital-subtext">
            Base {sheet.combat.armorClassBase} + Bonus{' '}
            {formatSignedModifier(
              derived.armorClass - sheet.combat.armorClassBase,
            )}
          </span>
        </div>

        {/* Initiative cliquable -> Assistant de Jet */}
        <button
          type="button"
          className="vital-tile vital-tile--interactive"
          onClick={() =>
            onSelectRollTarget({
              id: 'initiative',
              label: 'Initiative',
              originalLabel: 'Initiative',
              category: 'initiative',
              modifier: derived.initiative,
            })
          }
          title="Envoyer le jet d'Initiative dans l'Assistant de Jet"
        >
          <span className="vital-label">Initiative (Jet 1d20)</span>
          <span className="vital-value tabular-nums">
            {formatSignedModifier(derived.initiative)}
          </span>
          <span className="vital-subtext">Toucher pour lancer</span>
        </button>

        {/* Vitesse & Sens passifs */}
        <div className="vital-tile">
          <span className="vital-label">Vitesse & Sens</span>
          <span className="vital-value tabular-nums">
            {termMode === 'en' ? (
              `${metersToFeet(sheet.combat.speed)} ft`
            ) : (
              <>
                {sheet.combat.speed} m
                {termMode === 'bilingual' && (
                  <span className="original-term">
                    ({metersToFeet(sheet.combat.speed)} ft)
                  </span>
                )}
              </>
            )}
          </span>
          <span className="vital-subtext tabular-nums">
            Perc. passive {derived.passivePerception} · Inv.{' '}
            {derived.passiveInvestigation}
          </span>
        </div>

        {/* Réserves de Dés de Vie */}
        <div className="vital-tile">
          <span className="vital-label">Dés de Vie</span>
          <div className="hit-dice-inline tabular-nums">
            {activePools.map((size) => (
              <span key={size} className="badge-pill">
                {sheet.combat.hitDicePools[size].available}/
                {sheet.combat.hitDicePools[size].total}d{size}
              </span>
            ))}
          </div>
          <span className="vital-subtext">Par classe</span>
        </div>
      </div>

      {/* Barre secondaire : Jets contre la mort (si PV = 0), États / Épuisement et Boutons de Repos */}
      <div className="vital-actions-bar">
        <div className="conditions-cluster">
          <button
            type="button"
            className="action-btn"
            onClick={() => condDialogRef.current?.showModal()}
          >
            États & Épuisement ({sheet.combat.conditions.length} actif
            {sheet.combat.conditions.length > 1 ? 's' : ''} · Épuisement{' '}
            {sheet.combat.exhaustionLevel}/6)
          </button>

          {sheet.combat.conditions.map((condId) => {
            const meta = CANONICAL_CONDITIONS_5E.find((c) => c.id === condId);
            return (
              <span key={condId} className="badge-pill badge-pill--alert">
                {meta ? renderTerm(meta.name, meta.originalName) : condId}
              </span>
            );
          })}

          {sheet.combat.exhaustionLevel > 0 && (
            <span className="badge-pill badge-pill--alert tabular-nums">
              Épuisement Niv. {sheet.combat.exhaustionLevel}
            </span>
          )}
        </div>

        {/* Jets contre la mort automatiques dès que PV == 0 */}
        {sheet.combat.hpCurrent === 0 && (
          <div
            className="death-saves-strip"
            role="group"
            aria-label="Jets de sauvegarde contre la mort"
          >
            <strong className="vital-value--hp-crit">À 0 PV - Mort :</strong>
            <span className="tabular-nums">
              Succès {sheet.combat.deathSaves.successes}/3
            </span>
            <button
              type="button"
              className="action-btn"
              onClick={() =>
                onSetDeathSaves(
                  sheet.combat.deathSaves.successes + 1,
                  sheet.combat.deathSaves.failures,
                )
              }
            >
              +1 Succès
            </button>
            <span className="tabular-nums">
              Échecs {sheet.combat.deathSaves.failures}/3
            </span>
            <button
              type="button"
              className="action-btn"
              onClick={() =>
                onSetDeathSaves(
                  sheet.combat.deathSaves.successes,
                  sheet.combat.deathSaves.failures + 1,
                )
              }
            >
              +1 Échec
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={() => onSetDeathSaves(0, 0)}
            >
              Reset
            </button>
          </div>
        )}

        <div className="rest-buttons-cluster">
          <button
            type="button"
            className="action-btn action-btn--primary"
            onClick={onOpenShortRest}
          >
            Repos Court
          </button>
          <button
            type="button"
            className="action-btn action-btn--primary"
            onClick={onOpenLongRest}
          >
            Repos Long
          </button>
        </div>
      </div>

      {sheet.defenses &&
        (sheet.defenses.senses.length > 0 ||
          sheet.defenses.resistances.length > 0 ||
          sheet.defenses.damageImmunities.length > 0 ||
          sheet.defenses.conditionImmunities.length > 0 ||
          sheet.defenses.vulnerabilities.length > 0 ||
          Boolean(sheet.defenses.notes?.trim())) && (
          <div
            className="vital-defenses-strip"
            role="group"
            aria-label="Sens, résistances et immunités"
          >
            {sheet.defenses.senses.map((sense) => {
              const parts = getSenseDisplayParts(sense, termMode);
              return (
                <span
                  key={`sense-${sense}`}
                  className="badge-pill vital-defense-pill"
                >
                  Sens :{' '}
                  <span>
                    {parts.primary}
                    {parts.secondary ? (
                      <>
                        {' '}
                        <span className="original-term">
                          ({parts.secondary})
                        </span>
                      </>
                    ) : null}
                  </span>
                </span>
              );
            })}
            {sheet.defenses.resistances.map((res) => (
              <span
                key={`res-${res}`}
                className="badge-pill vital-defense-pill"
              >
                Rés. : {res}
              </span>
            ))}
            {sheet.defenses.damageImmunities.map((imm) => (
              <span
                key={`imm-dmg-${imm}`}
                className="badge-pill vital-defense-pill"
              >
                Imm. dégâts : {imm}
              </span>
            ))}
            {sheet.defenses.conditionImmunities.map((imm) => (
              <span
                key={`imm-cond-${imm}`}
                className="badge-pill vital-defense-pill"
              >
                Imm. état : {imm}
              </span>
            ))}
            {sheet.defenses.vulnerabilities.map((vuln) => (
              <span
                key={`vuln-${vuln}`}
                className="badge-pill vital-defense-pill vital-defense-pill--vuln"
              >
                Vuln. : {vuln}
              </span>
            ))}
            {sheet.defenses.notes?.trim() ? (
              <span className="vital-defense-note">
                {sheet.defenses.notes.trim()}
              </span>
            ) : null}
          </div>
        )}

      {/* Modale native <dialog> : Gestion rapide des Points de Vie (pavé tactile intégré, zéro clavier OS) */}
      <dialog
        ref={hpDialogRef}
        className="grimoire-dialog"
        aria-labelledby={hpDialogTitleId}
        onClick={handleDialogBackdropClick}
        onKeyDown={handleHpDialogKeyDown}
        onClose={() => setHpAmountDraft('')}
        {...({ closedby: 'any' } as Record<string, string>)}
      >
        <div className="dialog-header">
          <h2 id={hpDialogTitleId}>Points de Vie & Bouclier Temporaire</h2>
          <form method="dialog">
            <button type="submit" className="action-btn">
              Fermer
            </button>
          </form>
        </div>

        <p className="dialog-subtitle tabular-nums">
          État actuel :{' '}
          <strong>
            {sheet.combat.hpCurrent} / {sheet.combat.hpMax} PV
          </strong>{' '}
          (PV Temporaires : <strong>+{sheet.combat.hpTemp}</strong>)
        </p>

        <div className="hp-amount-display" aria-live="polite">
          <span className="hp-amount-label">Montant à appliquer</span>
          <span
            className={
              isHpAmountValid
                ? 'hp-amount-value tabular-nums'
                : 'hp-amount-value hp-amount-value--empty tabular-nums'
            }
          >
            {isHpAmountValid ? `${parsedHpAmount} PV` : '0 PV'}
          </span>
        </div>

        <div
          className="hp-keypad"
          role="group"
          aria-label="Pavé numérique des points de vie"
        >
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              className="hp-keypad-btn tabular-nums"
              autoFocus={digit === '1'}
              onClick={() => appendHpDigit(digit)}
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            className="hp-keypad-btn hp-keypad-btn--muted"
            disabled={hpAmountDraft.length === 0}
            onClick={() => setHpAmountDraft('')}
          >
            Effacer
          </button>
          <button
            type="button"
            className="hp-keypad-btn tabular-nums"
            onClick={() => appendHpDigit('0')}
          >
            0
          </button>
          <button
            type="button"
            className="hp-keypad-btn hp-keypad-btn--muted"
            disabled={hpAmountDraft.length === 0}
            aria-label="Effacer le dernier chiffre"
            onClick={backspaceHpDigit}
          >
            ⌫
          </button>
        </div>

        <div className="dialog-actions-grid">
          <button
            type="button"
            className="action-btn action-btn--danger tabular-nums"
            disabled={!isHpAmountValid}
            onClick={() => applyAndCloseHpModal('damage')}
          >
            {isHpAmountValid
              ? `Infliger -${parsedHpAmount} Dégâts`
              : 'Infliger Dégâts'}
          </button>
          <button
            type="button"
            className="action-btn action-btn--heal tabular-nums"
            disabled={!isHpAmountValid}
            onClick={() => applyAndCloseHpModal('heal')}
          >
            {isHpAmountValid ? `Soigner +${parsedHpAmount} PV` : 'Soigner PV'}
          </button>
          <button
            type="button"
            className="action-btn action-btn--primary tabular-nums"
            disabled={!isHpAmountValid}
            onClick={() => applyAndCloseHpModal('temp')}
          >
            {isHpAmountValid
              ? `PV Temporaires +${parsedHpAmount}`
              : 'PV Temporaires'}
          </button>
        </div>
      </dialog>

      {/* Modale native <dialog> : États (Conditions 5e) & Épuisement */}
      <dialog
        ref={condDialogRef}
        className="grimoire-dialog"
        aria-labelledby={condDialogTitleId}
        onClick={handleDialogBackdropClick}
        {...({ closedby: 'any' } as Record<string, string>)}
      >
        <div className="dialog-header">
          <h2 id={condDialogTitleId}>États D&D 5e & Niveau d’Épuisement</h2>
          <form method="dialog">
            <button type="submit" className="action-btn" autoFocus>
              Fermer
            </button>
          </form>
        </div>

        <div className="field-group">
          <label>Niveau d’Épuisement (0 à 6) :</label>
          <div className="button-cluster">
            {([0, 1, 2, 3, 4, 5, 6] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                className="segmented-btn tabular-nums"
                aria-pressed={sheet.combat.exhaustionLevel === lvl}
                onClick={() => onSetExhaustion(lvl)}
              >
                Niv. {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="field-group">
          <label>Conditions actives (toucher pour activer/désactiver) :</label>
          <div className="conditions-grid">
            {CANONICAL_CONDITIONS_5E.map((cond) => {
              const active = sheet.combat.conditions.includes(cond.id);
              return (
                <button
                  key={cond.id}
                  type="button"
                  className="skill-btn"
                  aria-pressed={active}
                  onClick={() => onToggleCondition(cond.id)}
                >
                  <span>{renderTerm(cond.name, cond.originalName)}</span>
                  <strong>{active ? 'ACTIF' : '-'}</strong>
                </button>
              );
            })}
          </div>
        </div>
      </dialog>
    </section>
  );
}
