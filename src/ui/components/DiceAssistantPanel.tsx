import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import {
  formatSignedModifier,
  parseDamageFormula,
  resolveDamageRoll,
  resolvePhysicalD20Check,
  rollVirtualD20Check,
} from '../../engine';
import type {
  AdvantageState,
  D20Resolution,
  DamageResolution,
} from '../../engine';
import { handleDialogBackdropClick } from './dialog-utils';
import type { ActiveRollTarget, DiceRollMode } from './dialog-utils';

export interface RollLogEntry {
  id: string;
  timestamp: string;
  title: string;
  subtitle: string;
  formulaBreakdown: string;
  isCritSuccess?: boolean;
  isCritFailure?: boolean;
}

export interface DiceAssistantPanelProps {
  isOpen: boolean;
  onToggleOpen: (open: boolean) => void;
  diceRollMode: DiceRollMode;
  activeTarget: ActiveRollTarget;
  hasExplicitTarget: boolean;
  rollLog: RollLogEntry[];
  renderTerm: (fr: string, en?: string) => ReactNode;
  onPushRollLog: (entry: RollLogEntry) => void;
  onClearRollLog: () => void;
}

type AssistantView = 'd20' | 'formula' | 'free';
type FreeDieSides = 4 | 6 | 8 | 10 | 12 | 20 | 100;

const FREE_DIE_OPTIONS: readonly FreeDieSides[] = [4, 6, 8, 10, 12, 20, 100];

export function DiceAssistantPanel({
  isOpen,
  onToggleOpen,
  diceRollMode,
  activeTarget,
  hasExplicitTarget,
  rollLog,
  renderTerm,
  onPushRollLog,
  onClearRollLog,
}: DiceAssistantPanelProps) {
  const titleId = useId();
  const historyTitleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const historyDialogRef = useRef<HTMLDialogElement>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [position, setPosition] = useState<{ left: number; top: number } | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [moveAnnouncement, setMoveAnnouncement] = useState('');

  const [assistantView, setAssistantView] = useState<AssistantView>(
    hasExplicitTarget ? (activeTarget.initialMode ?? 'd20') : 'free',
  );
  const [advantage, setAdvantage] = useState<AdvantageState>('normal');
  const [pendingFirstD20, setPendingFirstD20] = useState<number | null>(null);

  // État Formule / Dégâts
  const [isCriticalDamage, setIsCriticalDamage] = useState<boolean>(
    activeTarget.isCritical ?? false,
  );
  const [pendingDamageRolls, setPendingDamageRolls] = useState<number[]>([]);

  // État Jet Libre (d4..d100)
  const [freeDieSides, setFreeDieSides] = useState<FreeDieSides>(20);
  const [freeDiceCount, setFreeDiceCount] = useState<number>(1);
  const [freeModifier, setFreeModifier] = useState<number>(0);
  const [pendingFreeRolls, setPendingFreeRolls] = useState<number[]>([]);
  const [freeD100Input, setFreeD100Input] = useState<number>(50);

  // Dernier résultat affiché dans la zone fixe supérieure
  const [lastD20, setLastD20] = useState<D20Resolution | null>(null);
  const [lastDamage, setLastDamage] = useState<DamageResolution | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (hasExplicitTarget) {
      setAssistantView(activeTarget.initialMode ?? 'd20');
      setIsCriticalDamage(activeTarget.isCritical ?? false);
    } else {
      setAssistantView('free');
    }
    setPendingFirstD20(null);
    setPendingDamageRolls([]);
    setPendingFreeRolls([]);
    setLastD20(null);
    setLastDamage(null);
  }, [isOpen, activeTarget, hasExplicitTarget]);

  const clampPosition = (left: number, top: number) => {
    if (typeof window === 'undefined') return { left: 16, top: 16 };
    const el = dialogRef.current;
    const width = el?.offsetWidth ?? 410;
    const height = el?.offsetHeight ?? 440;
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    const maxTop = Math.max(8, window.innerHeight - height - 8);
    return {
      left: Math.max(8, Math.min(left, maxLeft)),
      top: Math.max(8, Math.min(top, maxTop)),
    };
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setPosition((prev) =>
        prev ? clampPosition(prev.left, prev.top) : null,
      );
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const announceMove = (description: string) => {
    setMoveAnnouncement(description);
    window.setTimeout(() => setMoveAnnouncement(''), 1000);
  };

  const handleHeaderPointerDown = (e: PointerEvent<HTMLElement>) => {
    const targetEl = e.target as HTMLElement;
    const interactiveControl = targetEl.closest(
      'button:not(.drag-handle), input, select, textarea, a',
    );
    if (e.button !== 0 || interactiveControl) return;

    const dialogEl = dialogRef.current;
    if (!dialogEl) return;
    const rect = dialogEl.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const handleHeaderPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const next = clampPosition(
      e.clientX - dragOffsetRef.current.x,
      e.clientY - dragOffsetRef.current.y,
    );
    setPosition(next);
  };

  const handleHeaderLostPointerCapture = () => {
    if (isDragging) {
      setIsDragging(false);
      announceMove('Assistant de jet déplacé');
    }
  };

  const handleHandleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = 20;
    const dialogEl = dialogRef.current;
    if (!dialogEl) return;
    const rect = dialogEl.getBoundingClientRect();
    const currentLeft = position?.left ?? rect.left;
    const currentTop = position?.top ?? rect.top;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setPosition(clampPosition(currentLeft - step, currentTop));
      announceMove('Assistant de jet déplacé vers la gauche');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setPosition(clampPosition(currentLeft + step, currentTop));
      announceMove('Assistant de jet déplacé vers la droite');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPosition(clampPosition(currentLeft, currentTop - step));
      announceMove('Assistant de jet déplacé vers le haut');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPosition(clampPosition(currentLeft, currentTop + step));
      announceMove('Assistant de jet déplacé vers le bas');
    }
  };

  const toggleFreeRollView = () => {
    if (assistantView === 'free' && hasExplicitTarget) {
      setAssistantView(activeTarget.initialMode ?? 'd20');
    } else {
      setAssistantView('free');
    }
    setPendingFirstD20(null);
    setPendingDamageRolls([]);
    setPendingFreeRolls([]);
    setLastD20(null);
    setLastDamage(null);
  };

  const nowTime = () =>
    new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  /* === 1. RÉSOLUTION JET D20 (PHYSIQUE & VIRTUEL) === */
  const handlePhysicalD20Tap = (dieValue: number) => {
    if (advantage !== 'normal' && pendingFirstD20 === null) {
      setPendingFirstD20(dieValue);
      return;
    }

    const primaryDie = pendingFirstD20 ?? dieValue;
    const secondaryDie = pendingFirstD20 !== null ? dieValue : undefined;
    setPendingFirstD20(null);

    const res = resolvePhysicalD20Check({
      label: activeTarget.label,
      primaryDie,
      ...(secondaryDie !== undefined ? { secondaryDie } : {}),
      advantage,
      modifier: activeTarget.modifier,
    });
    setLastD20(res);
    setLastDamage(null);

    onPushRollLog({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowTime(),
      title: activeTarget.label,
      subtitle:
        advantage === 'normal'
          ? 'Dé physique d20'
          : advantage === 'advantage'
            ? 'Dé physique (Avantage)'
            : 'Dé physique (Désavantage)',
      formulaBreakdown: res.formulaBreakdown,
      isCritSuccess: res.isCriticalSuccess,
      isCritFailure: res.isCriticalFailure,
    });
  };

  const handleVirtualD20 = () => {
    setPendingFirstD20(null);
    const res = rollVirtualD20Check({
      label: activeTarget.label,
      advantage,
      modifier: activeTarget.modifier,
    });
    setLastD20(res);
    setLastDamage(null);

    onPushRollLog({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowTime(),
      title: activeTarget.label,
      subtitle:
        advantage === 'normal'
          ? 'Jet virtuel 1d20'
          : advantage === 'advantage'
            ? 'Jet virtuel (Avantage)'
            : 'Jet virtuel (Désavantage)',
      formulaBreakdown: res.formulaBreakdown,
      isCritSuccess: res.isCriticalSuccess,
      isCritFailure: res.isCriticalFailure,
    });
  };

  /* === 2. RÉSOLUTION FORMULE DE DÉGÂTS (PHYSIQUE & VIRTUELLE) === */
  const activeFormula = activeTarget.damageFormula ?? '1d8';
  const parsedDamage = (() => {
    try {
      return parseDamageFormula(activeFormula);
    } catch {
      return { diceCount: 1, dieSides: 8, modifier: 0 };
    }
  })();
  const expectedDamageDiceCount = isCriticalDamage
    ? parsedDamage.diceCount * 2
    : parsedDamage.diceCount;

  const handlePhysicalDamageDieTap = (val: number) => {
    const nextRolls = [...pendingDamageRolls, val];
    if (nextRolls.length < expectedDamageDiceCount) {
      setPendingDamageRolls(nextRolls);
      return;
    }

    setPendingDamageRolls([]);
    const dmg = resolveDamageRoll(activeFormula, {
      isCritical: isCriticalDamage,
      manualRolls: nextRolls,
    });
    setLastDamage(dmg);
    setLastD20(null);

    onPushRollLog({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowTime(),
      title: activeTarget.label,
      subtitle: `Dé physique d${parsedDamage.dieSides}${
        isCriticalDamage ? ' (Critique)' : ''
      }`,
      formulaBreakdown: dmg.formulaBreakdown,
    });
  };

  const handleVirtualDamageRoll = () => {
    setPendingDamageRolls([]);
    const dmg = resolveDamageRoll(activeFormula, {
      isCritical: isCriticalDamage,
    });
    setLastDamage(dmg);
    setLastD20(null);

    onPushRollLog({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowTime(),
      title: activeTarget.label,
      subtitle: `Jet virtuel${isCriticalDamage ? ' (Critique)' : ''}`,
      formulaBreakdown: dmg.formulaBreakdown,
    });
  };

  /* === 3. RÉSOLUTION JET LIBRE (d4, d6, d8, d10, d12, d20, d100) === */
  const freeFormulaString = `${freeDiceCount}d${freeDieSides}${
    freeModifier !== 0 ? ` ${formatSignedModifier(freeModifier)}` : ''
  }`;

  const handlePhysicalFreeDieTap = (val: number) => {
    const nextRolls = [...pendingFreeRolls, val];
    if (nextRolls.length < freeDiceCount) {
      setPendingFreeRolls(nextRolls);
      return;
    }

    setPendingFreeRolls([]);
    const res = resolveDamageRoll(freeFormulaString, {
      manualRolls: nextRolls,
    });
    setLastDamage(res);
    setLastD20(null);

    onPushRollLog({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowTime(),
      title: `Jet Libre (${freeFormulaString})`,
      subtitle: `Dé physique d${freeDieSides}`,
      formulaBreakdown: res.formulaBreakdown,
    });
  };

  const handleVirtualFreeRoll = () => {
    setPendingFreeRolls([]);
    const res = resolveDamageRoll(freeFormulaString);
    setLastDamage(res);
    setLastD20(null);

    onPushRollLog({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowTime(),
      title: `Jet Libre (${freeFormulaString})`,
      subtitle: 'Jet virtuel',
      formulaBreakdown: res.formulaBreakdown,
    });
  };

  const floatingStyle =
    position !== null
      ? {
          left: `${position.left}px`,
          top: `${position.top}px`,
          right: 'auto',
          bottom: 'auto',
        }
      : undefined;

  const activeResultBreakdown =
    lastD20?.formulaBreakdown ?? lastDamage?.formulaBreakdown ?? null;

  return (
    <>
      <div className="visually-hidden" aria-live="polite">
        {moveAnnouncement}
      </div>

      {/* Bouton flottant permanent (FAB) visible même au scroll */}
      <button
        type="button"
        className="dice-fab-btn action-btn action-btn--primary"
        onClick={() => onToggleOpen(!isOpen)}
        aria-expanded={isOpen}
        title="Ouvrir ou fermer l'Assistant de Jet Hybride (d4 à d100)"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2" />
          <polyline points="12 22 12 12" />
          <polyline points="21 7 12 12 3 7" />
        </svg>
        <span>{isOpen ? 'Masquer Dés' : 'Assistant de Jet'}</span>
      </button>

      {/* Fenêtre flottante non-modale déplaçable (sans flou ni scroll pour voir le résultat) */}
      <dialog
        ref={dialogRef}
        open={isOpen}
        className="floating-dice-dialog"
        style={floatingStyle}
        aria-labelledby={titleId}
      >
        {/* 1. Barre de titre déplaçable + Historique + Jet Libre + Fermer */}
        <div
          className={`floating-dice-header ${isDragging ? 'dragging' : ''}`}
          onPointerDown={handleHeaderPointerDown}
          onPointerMove={handleHeaderPointerMove}
          onLostPointerCapture={handleHeaderLostPointerCapture}
        >
          <div className="floating-dice-title-group">
            <button
              type="button"
              className={`drag-handle ${isDragging ? 'dragging' : ''}`}
              aria-label="Poignée de déplacement de l'assistant de jet. Utilisez les flèches du clavier pour déplacer."
              title="Glisser pour déplacer la fenêtre (ou utiliser les flèches du clavier)"
              onKeyDown={handleHandleKeyDown}
            >
              ⠿
            </button>
            <h2 id={titleId}>Assistant de Jet</h2>
          </div>

          <div className="dice-header-actions">
            <button
              type="button"
              className="action-btn dice-header-btn dice-icon-count-btn tabular-nums"
              onClick={() => historyDialogRef.current?.showModal()}
              aria-label={`Ouvrir l'historique des jets (${rollLog.length})`}
              title={`Historique des jets (${rollLog.length})`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 3v5h5" />
                <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
                <path d="M12 7v5l4 2" />
              </svg>
              <span>{rollLog.length}</span>
            </button>
            <button
              type="button"
              className="action-btn dice-header-btn"
              aria-pressed={assistantView === 'free'}
              onClick={toggleFreeRollView}
              title="Configurer un jet libre (d4 à d100)"
            >
              {assistantView === 'free' && hasExplicitTarget
                ? 'Jet ciblé'
                : 'Jet Libre'}
            </button>
            <button
              type="button"
              className="action-btn dice-header-btn"
              onClick={() => onToggleOpen(false)}
              aria-label="Fermer l'assistant de jet"
              title="Fermer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 2. Carte Résultat fixe sous le header (aucun texte répété, uniquement calcul + résultat) */}
        <div className="dice-result-fixed" aria-live="polite">
          {activeResultBreakdown !== null ? (
            <div className="dice-result-content">
              <span className="dice-result-formula tabular-nums">
                {activeResultBreakdown}
              </span>
              {lastD20?.isCriticalSuccess && (
                <span className="badge-pill dice-crit-badge--ok">
                  CRITIQUE (20)
                </span>
              )}
              {lastD20?.isCriticalFailure && (
                <span className="badge-pill dice-crit-badge--fail">
                  ÉCHEC (1)
                </span>
              )}
            </div>
          ) : (
            <span className="muted-note">
              {diceRollMode === 'physical'
                ? 'Prêt — Touchez la valeur de votre dé'
                : 'Prêt — Cliquez sur Lancer'}
            </span>
          )}
        </div>

        {/* 3. Corps compact (sans onglets ni historique) */}
        <div className="floating-dice-body">
          {/* Source du jet sélectionné (masquée en mode Jet Libre) */}
          {assistantView !== 'free' && (
            <div className="stat-preview-row">
              <div className="dice-target-info">
                <span className="muted-note">Jet sélectionné :</span>
                <div>
                  <strong>
                    {renderTerm(activeTarget.label, activeTarget.originalLabel)}
                  </strong>
                </div>
              </div>
              <span className="badge-pill badge-pill--nowrap tabular-nums">
                {assistantView === 'd20'
                  ? `1d20 ${formatSignedModifier(activeTarget.modifier)}`
                  : `${expectedDamageDiceCount}d${parsedDamage.dieSides}${
                      parsedDamage.modifier !== 0
                        ? ` ${formatSignedModifier(parsedDamage.modifier)}`
                        : ''
                    }`}
              </span>
            </div>
          )}

          {/* === VUE 1 : JET DE D20 === */}
          {assistantView === 'd20' && (
            <>
              <div
                className="segmented-control"
                role="group"
                aria-label="Mode d'avantage du jet d20"
              >
                <button
                  type="button"
                  className="segmented-btn"
                  aria-pressed={advantage === 'normal'}
                  onClick={() => {
                    setAdvantage('normal');
                    setPendingFirstD20(null);
                  }}
                >
                  Normal
                </button>
                <button
                  type="button"
                  className="segmented-btn"
                  aria-pressed={advantage === 'advantage'}
                  onClick={() => {
                    setAdvantage('advantage');
                    setPendingFirstD20(null);
                  }}
                >
                  Avantage
                </button>
                <button
                  type="button"
                  className="segmented-btn"
                  aria-pressed={advantage === 'disadvantage'}
                  onClick={() => {
                    setAdvantage('disadvantage');
                    setPendingFirstD20(null);
                  }}
                >
                  Désavantage
                </button>
              </div>

              {diceRollMode === 'physical' ? (
                <div className="field-group">
                  {advantage !== 'normal' && (
                    <label id="modal-d20-keypad-label">
                      {pendingFirstD20 === null
                        ? 'Touchez le 1er dé d20 :'
                        : `1er dé = ${pendingFirstD20} — Touchez le 2e dé :`}
                    </label>
                  )}
                  <div
                    className="d20-keypad"
                    role="group"
                    aria-label="Pavé de saisie du dé d20 physique"
                  >
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((val) => (
                      <button
                        key={val}
                        type="button"
                        className={`d20-key tabular-nums ${
                          val === 20
                            ? 'd20-key--crit'
                            : val === 1
                              ? 'd20-key--fumble'
                              : ''
                        }`}
                        onClick={() => handlePhysicalD20Tap(val)}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="action-btn action-btn--primary virtual-roll-cta tabular-nums"
                  onClick={handleVirtualD20}
                >
                  Lancer 1d20 {formatSignedModifier(activeTarget.modifier)}
                </button>
              )}

              {activeTarget.damageFormula && (
                <button
                  type="button"
                  className="action-btn tabular-nums"
                  onClick={() => {
                    setAssistantView('formula');
                    setPendingDamageRolls([]);
                    setLastD20(null);
                    setLastDamage(null);
                  }}
                >
                  Passer aux Dégâts ({activeTarget.damageFormula}) →
                </button>
              )}
            </>
          )}

          {/* === VUE 2 : DÉGÂTS D'ARME ADAPTÉS AU DÉ === */}
          {assistantView === 'formula' && (
            <>
              <div
                className="segmented-control"
                role="group"
                aria-label="Dégâts normaux ou critiques"
              >
                <button
                  type="button"
                  className="segmented-btn tabular-nums"
                  aria-pressed={!isCriticalDamage}
                  onClick={() => {
                    setIsCriticalDamage(false);
                    setPendingDamageRolls([]);
                  }}
                >
                  Normal ({parsedDamage.diceCount}d{parsedDamage.dieSides})
                </button>
                <button
                  type="button"
                  className="segmented-btn tabular-nums"
                  aria-pressed={isCriticalDamage}
                  onClick={() => {
                    setIsCriticalDamage(true);
                    setPendingDamageRolls([]);
                  }}
                >
                  Critique ({parsedDamage.diceCount * 2}d
                  {parsedDamage.dieSides})
                </button>
              </div>

              {diceRollMode === 'physical' ? (
                <div className="field-group">
                  {expectedDamageDiceCount > 1 && (
                    <label>
                      Dé {pendingDamageRolls.length + 1}/
                      {expectedDamageDiceCount}
                      {pendingDamageRolls.length > 0
                        ? ` (${pendingDamageRolls.join(' + ')})`
                        : ''}
                    </label>
                  )}
                  <div
                    className="d20-keypad"
                    role="group"
                    aria-label={`Pavé de saisie du dé d${parsedDamage.dieSides}`}
                  >
                    {Array.from(
                      { length: parsedDamage.dieSides },
                      (_, i) => i + 1,
                    ).map((val) => (
                      <button
                        key={val}
                        type="button"
                        className={`d20-key tabular-nums ${
                          val === parsedDamage.dieSides ? 'd20-key--crit' : ''
                        }`}
                        onClick={() => handlePhysicalDamageDieTap(val)}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="action-btn action-btn--primary virtual-roll-cta tabular-nums"
                  onClick={handleVirtualDamageRoll}
                >
                  Lancer {expectedDamageDiceCount}d{parsedDamage.dieSides}
                  {parsedDamage.modifier !== 0
                    ? ` ${formatSignedModifier(parsedDamage.modifier)}`
                    : ''}
                </button>
              )}
            </>
          )}

          {/* === VUE 3 : JET LIBRE (d4, d6, d8, d10, d12, d20, d100) === */}
          {assistantView === 'free' && (
            <>
              <div
                className="button-cluster"
                role="group"
                aria-label="Choix du type de dé"
              >
                {FREE_DIE_OPTIONS.map((sides) => (
                  <button
                    key={sides}
                    type="button"
                    className="segmented-btn tabular-nums"
                    aria-pressed={freeDieSides === sides}
                    onClick={() => {
                      setFreeDieSides(sides);
                      setPendingFreeRolls([]);
                    }}
                  >
                    d{sides}
                  </button>
                ))}
              </div>

              <div className="free-roll-config-row">
                <div className="resource-controls">
                  <button
                    type="button"
                    className="stepper-btn tabular-nums"
                    disabled={freeDiceCount <= 1}
                    onClick={() => {
                      setFreeDiceCount((c) => Math.max(1, c - 1));
                      setPendingFreeRolls([]);
                    }}
                    aria-label="Réduire le nombre de dés"
                  >
                    −
                  </button>
                  <strong className="tabular-nums">
                    {freeDiceCount}d{freeDieSides}
                  </strong>
                  <button
                    type="button"
                    className="stepper-btn tabular-nums"
                    disabled={freeDiceCount >= 10}
                    onClick={() => {
                      setFreeDiceCount((c) => Math.min(10, c + 1));
                      setPendingFreeRolls([]);
                    }}
                    aria-label="Augmenter le nombre de dés"
                  >
                    +
                  </button>
                </div>

                <div className="resource-controls">
                  <button
                    type="button"
                    className="stepper-btn tabular-nums"
                    onClick={() => setFreeModifier((m) => m - 1)}
                    aria-label="Réduire le bonus"
                  >
                    −
                  </button>
                  <strong className="tabular-nums">
                    {formatSignedModifier(freeModifier)}
                  </strong>
                  <button
                    type="button"
                    className="stepper-btn tabular-nums"
                    onClick={() => setFreeModifier((m) => m + 1)}
                    aria-label="Augmenter le bonus"
                  >
                    +
                  </button>
                </div>
              </div>

              {diceRollMode === 'physical' ? (
                freeDieSides === 100 ? (
                  <div className="inline-input-row">
                    <input
                      id="free-d100-input"
                      type="number"
                      aria-label="Score du d100 physique"
                      min={1}
                      max={100}
                      value={freeD100Input}
                      onChange={(e) =>
                        setFreeD100Input(
                          Math.min(
                            100,
                            Math.max(1, Number(e.target.value) || 1),
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      className="action-btn action-btn--primary"
                      onClick={() => handlePhysicalFreeDieTap(freeD100Input)}
                    >
                      Valider d100
                    </button>
                  </div>
                ) : (
                  <div className="field-group">
                    {freeDiceCount > 1 && (
                      <label>
                        Dé {pendingFreeRolls.length + 1}/{freeDiceCount}
                        {pendingFreeRolls.length > 0
                          ? ` (${pendingFreeRolls.join(' + ')})`
                          : ''}
                      </label>
                    )}
                    <div
                      className="d20-keypad"
                      role="group"
                      aria-label={`Pavé de saisie du dé d${freeDieSides}`}
                    >
                      {Array.from(
                        { length: freeDieSides },
                        (_, i) => i + 1,
                      ).map((val) => (
                        <button
                          key={val}
                          type="button"
                          className="d20-key tabular-nums"
                          onClick={() => handlePhysicalFreeDieTap(val)}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <button
                  type="button"
                  className="action-btn action-btn--primary virtual-roll-cta tabular-nums"
                  onClick={handleVirtualFreeRoll}
                >
                  Lancer {freeFormulaString}
                </button>
              )}
            </>
          )}
        </div>
      </dialog>

      {/* Modale dédiée : Historique des jets de la séance */}
      <dialog
        ref={historyDialogRef}
        className="grimoire-dialog"
        aria-labelledby={historyTitleId}
        onClick={handleDialogBackdropClick}
        {...({ closedby: 'any' } as Record<string, string>)}
      >
        <div className="dialog-header">
          <h2 id={historyTitleId}>
            Historique de Séance ({rollLog.length})
          </h2>
          <form method="dialog">
            <button type="submit" className="action-btn" autoFocus>
              Fermer
            </button>
          </form>
        </div>

        {rollLog.length === 0 ? (
          <p className="muted-note">
            Aucun jet enregistré durant cette séance.
          </p>
        ) : (
          <div className="roll-log-list roll-log-list--modal">
            {rollLog.map((entry) => (
              <div key={entry.id} className="roll-log-item">
                <div>
                  <strong>{entry.title}</strong>
                  <div className="muted-note">
                    {entry.subtitle} · {entry.timestamp}
                  </div>
                </div>
                <div className="tabular-nums" style={{ fontWeight: 700 }}>
                  {entry.formulaBreakdown}
                </div>
              </div>
            ))}
          </div>
        )}

        {rollLog.length > 0 && (
          <div className="dialog-footer-actions">
            <button
              type="button"
              className="action-btn"
              onClick={() => {
                setLastD20(null);
                setLastDamage(null);
                onClearRollLog();
              }}
            >
              Effacer l’historique
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
