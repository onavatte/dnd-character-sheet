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
import type { ActiveRollTarget } from './dialog-utils';

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
  activeTarget: ActiveRollTarget;
  rollLog: RollLogEntry[];
  renderTerm: (fr: string, en?: string) => ReactNode;
  onPushRollLog: (entry: RollLogEntry) => void;
  onClearRollLog: () => void;
}

type AssistantTab = 'd20' | 'formula' | 'free';
type FreeDieSides = 4 | 6 | 8 | 10 | 12 | 20 | 100;

const FREE_DIE_OPTIONS: readonly FreeDieSides[] = [4, 6, 8, 10, 12, 20, 100];

export function DiceAssistantPanel({
  isOpen,
  onToggleOpen,
  activeTarget,
  rollLog,
  renderTerm,
  onPushRollLog,
  onClearRollLog,
}: DiceAssistantPanelProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [position, setPosition] = useState<{ left: number; top: number } | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [moveAnnouncement, setMoveAnnouncement] = useState('');

  const [activeTab, setActiveTab] = useState<AssistantTab>(
    activeTarget.initialMode ?? 'd20',
  );
  const [advantage, setAdvantage] = useState<AdvantageState>('normal');
  const [pendingFirstD20, setPendingFirstD20] = useState<number | null>(null);

  // État pour le mode Formule / Dégâts (d4, d6, d8, d10, d12...)
  const [isCriticalDamage, setIsCriticalDamage] = useState<boolean>(
    activeTarget.isCritical ?? false,
  );
  const [pendingDamageRolls, setPendingDamageRolls] = useState<number[]>([]);

  // État pour le mode Jet Libre (d4..d100)
  const [freeDieSides, setFreeDieSides] = useState<FreeDieSides>(20);
  const [freeDiceCount, setFreeDiceCount] = useState<number>(1);
  const [freeModifier, setFreeModifier] = useState<number>(0);
  const [pendingFreeRolls, setPendingFreeRolls] = useState<number[]>([]);
  const [freeD100Input, setFreeD100Input] = useState<number>(50);

  // Dernier résultat affiché
  const [lastD20, setLastD20] = useState<D20Resolution | null>(null);
  const [lastDamage, setLastDamage] = useState<DamageResolution | null>(null);

  // Synchroniser l'onglet actif et le mode critique quand la cible change
  useEffect(() => {
    setActiveTab(activeTarget.initialMode ?? 'd20');
    setIsCriticalDamage(activeTarget.isCritical ?? false);
    setPendingFirstD20(null);
    setPendingDamageRolls([]);
  }, [activeTarget]);

  const clampPosition = (left: number, top: number) => {
    if (typeof window === 'undefined') return { left: 16, top: 16 };
    const el = dialogRef.current;
    const width = el?.offsetWidth ?? 420;
    const height = el?.offsetHeight ?? 520;
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

  const dockToPresetCorner = () => {
    if (typeof window === 'undefined') return;
    if (position === null) {
      setPosition(clampPosition(16, 80));
      announceMove('Assistant de jet ancré en haut à gauche');
    } else {
      setPosition(null);
      announceMove('Assistant de jet ancré en bas à droite');
    }
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

  /* === 2. RÉSOLUTION FORMULE DE DÉGÂTS (PHYSIQUE ADAPTÉE AU DÉ & VIRTUELLE) === */
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
      ? { left: `${position.left}px`, top: `${position.top}px`, right: 'auto', bottom: 'auto' }
      : undefined;

  return (
    <>
      <div className="visually-hidden" aria-live="polite">
        {moveAnnouncement}
      </div>

      {/* Bouton flottant permanent (FAB) qui reste visible au scroll */}
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

      {/* Fenêtre flottante non-modale déplaçable (sans flou ni blocage de l'arrière-plan) */}
      <dialog
        ref={dialogRef}
        open={isOpen}
        className="floating-dice-dialog"
        style={floatingStyle}
        aria-labelledby={titleId}
      >
        {/* Barre de titre déplaçable au doigt / souris + poignée clavier accessible */}
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

          <div className="button-cluster">
            <button
              type="button"
              className="action-btn"
              onClick={dockToPresetCorner}
              title="Basculer l'ancrage de la fenêtre (Haut-Gauche / Bas-Droite)"
            >
              Ancrer
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={() => onToggleOpen(false)}
            >
              Fermer
            </button>
          </div>
        </div>

        {/* Sélecteur du mode de jet : Jet d20 | Dégâts d'Arme | Jet Libre */}
        <div
          className="segmented-control"
          role="tablist"
          aria-label="Type de jet dans l'assistant"
        >
          <button
            type="button"
            role="tab"
            className="segmented-btn"
            aria-selected={activeTab === 'd20'}
            aria-pressed={activeTab === 'd20'}
            onClick={() => setActiveTab('d20')}
          >
            Jet d20
          </button>
          {activeTarget.damageFormula && (
            <button
              type="button"
              role="tab"
              className="segmented-btn tabular-nums"
              aria-selected={activeTab === 'formula'}
              aria-pressed={activeTab === 'formula'}
              onClick={() => setActiveTab('formula')}
            >
              Dégâts ({activeTarget.damageFormula})
            </button>
          )}
          <button
            type="button"
            role="tab"
            className="segmented-btn"
            aria-selected={activeTab === 'free'}
            aria-pressed={activeTab === 'free'}
            onClick={() => setActiveTab('free')}
          >
            Jet Libre (d4–d100)
          </button>
        </div>

        {/* === ONGLET 1 : JET DE D20 (Compétence, Sauvegarde, Attaque, Initiative) === */}
        {activeTab === 'd20' && (
          <div className="floating-dice-body">
            <div className="stat-preview-row">
              <div>
                <span className="muted-note">Jet sélectionné :</span>
                <div>
                  <strong>
                    {renderTerm(activeTarget.label, activeTarget.originalLabel)}
                  </strong>
                </div>
              </div>
              <span className="badge-pill tabular-nums">
                1d20 {formatSignedModifier(activeTarget.modifier)}
              </span>
            </div>

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
                Avantage (2d20↑)
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
                Désavantage (2d20↓)
              </button>
            </div>

            <div className="field-group">
              <label id="modal-d20-keypad-label">
                {advantage === 'normal'
                  ? 'Dé physique d20 — Touchez votre score :'
                  : pendingFirstD20 === null
                    ? 'Dé physique d20 — Touchez le 1er dé :'
                    : `1er dé = ${pendingFirstD20} — Touchez le 2e dé :`}
              </label>
              <div
                className="d20-keypad"
                role="group"
                aria-labelledby="modal-d20-keypad-label"
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

            <div className="button-cluster">
              <button
                type="button"
                className="action-btn action-btn--primary"
                onClick={handleVirtualD20}
              >
                Lancer 1d20 Virtuel
              </button>
              {activeTarget.damageFormula && (
                <button
                  type="button"
                  className="action-btn tabular-nums"
                  onClick={() => setActiveTab('formula')}
                >
                  Passer aux Dégâts ({activeTarget.damageFormula}) →
                </button>
              )}
            </div>
          </div>
        )}

        {/* === ONGLET 2 : DÉGÂTS D'ARME ADAPTÉS AU TYPE DE DÉ (d4, d6, d8, d10, d12) === */}
        {activeTab === 'formula' && (
          <div className="floating-dice-body">
            <div className="stat-preview-row">
              <div>
                <span className="muted-note">Dégâts sélectionnés :</span>
                <div>
                  <strong>
                    {renderTerm(activeTarget.label, activeTarget.originalLabel)}
                  </strong>
                </div>
              </div>
              <span className="badge-pill tabular-nums">
                {expectedDamageDiceCount}d{parsedDamage.dieSides}{' '}
                {parsedDamage.modifier !== 0
                  ? formatSignedModifier(parsedDamage.modifier)
                  : ''}
              </span>
            </div>

            <div
              className="segmented-control"
              role="group"
              aria-label="Dégâts normaux ou critiques"
            >
              <button
                type="button"
                className="segmented-btn"
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
                className="segmented-btn"
                aria-pressed={isCriticalDamage}
                onClick={() => {
                  setIsCriticalDamage(true);
                  setPendingDamageRolls([]);
                }}
              >
                Critique ({parsedDamage.diceCount * 2}d{parsedDamage.dieSides})
              </button>
            </div>

            <div className="field-group">
              <label id="modal-damage-keypad-label">
                Dé physique d{parsedDamage.dieSides} — Touchez le résultat du dé{' '}
                {pendingDamageRolls.length + 1}/{expectedDamageDiceCount}
                {pendingDamageRolls.length > 0
                  ? ` (déjà saisi : ${pendingDamageRolls.join(' + ')})`
                  : ''}
                :
              </label>
              <div
                className="d20-keypad"
                role="group"
                aria-labelledby="modal-damage-keypad-label"
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

            <div className="button-cluster">
              <button
                type="button"
                className="action-btn action-btn--primary tabular-nums"
                onClick={handleVirtualDamageRoll}
              >
                Lancer {expectedDamageDiceCount}d{parsedDamage.dieSides}{' '}
                Virtuel
              </button>
            </div>
          </div>
        )}

        {/* === ONGLET 3 : JET LIBRE MULTI-DÉS (d4, d6, d8, d10, d12, d20, d100) === */}
        {activeTab === 'free' && (
          <div className="floating-dice-body">
            <div className="field-group">
              <label>1. Choisissez le type de dé :</label>
              <div className="button-cluster">
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
            </div>

            <div className="free-roll-config-row">
              <div className="resource-controls">
                <span className="muted-note">Nombre :</span>
                <button
                  type="button"
                  className="stepper-btn tabular-nums"
                  disabled={freeDiceCount <= 1}
                  onClick={() => {
                    setFreeDiceCount((c) => Math.max(1, c - 1));
                    setPendingFreeRolls([]);
                  }}
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
                >
                  +
                </button>
              </div>

              <div className="resource-controls">
                <span className="muted-note">Bonus :</span>
                <button
                  type="button"
                  className="stepper-btn tabular-nums"
                  onClick={() => setFreeModifier((m) => m - 1)}
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
                >
                  +
                </button>
              </div>
            </div>

            {freeDieSides === 100 ? (
              <div className="field-group">
                <label htmlFor="free-d100-input">
                  Score obtenu sur votre d100 physique (1 à 100) :
                </label>
                <div className="inline-input-row">
                  <input
                    id="free-d100-input"
                    type="number"
                    min={1}
                    max={100}
                    value={freeD100Input}
                    onChange={(e) =>
                      setFreeD100Input(
                        Math.min(100, Math.max(1, Number(e.target.value) || 1)),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => handlePhysicalFreeDieTap(freeD100Input)}
                  >
                    Valider d100
                  </button>
                </div>
              </div>
            ) : (
              <div className="field-group">
                <label id="modal-free-keypad-label">
                  Dé physique d{freeDieSides} — Touchez le dé{' '}
                  {pendingFreeRolls.length + 1}/{freeDiceCount}
                  {pendingFreeRolls.length > 0
                    ? ` (déjà saisi : ${pendingFreeRolls.join(' + ')})`
                    : ''}
                  :
                </label>
                <div
                  className="d20-keypad"
                  role="group"
                  aria-labelledby="modal-free-keypad-label"
                >
                  {Array.from({ length: freeDieSides }, (_, i) => i + 1).map(
                    (val) => (
                      <button
                        key={val}
                        type="button"
                        className="d20-key tabular-nums"
                        onClick={() => handlePhysicalFreeDieTap(val)}
                      >
                        {val}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              className="action-btn action-btn--primary tabular-nums"
              onClick={handleVirtualFreeRoll}
            >
              Lancer {freeFormulaString} Virtuel
            </button>
          </div>
        )}

        {/* Dernier résultat en direct */}
        <div
          aria-live="polite"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          {lastD20 && (
            <div className="roll-banner">
              <div>
                <strong>{lastD20.label}</strong> (
                {lastD20.mode === 'physical' ? 'Dé physique' : 'Jet virtuel'})
                {lastD20.isCriticalSuccess && ' — RÉUSSITE CRITIQUE (20) !'}
                {lastD20.isCriticalFailure && ' — ÉCHEC CRITIQUE (1) !'}
              </div>
              <div
                className="tabular-nums"
                style={{ fontSize: '1.15rem', fontWeight: 700 }}
              >
                {lastD20.formulaBreakdown}
              </div>
            </div>
          )}

          {lastDamage && (
            <div className="roll-banner">
              <div>
                <strong>Résultat ({lastDamage.formula})</strong>{' '}
                {lastDamage.isCritical ? '(Critique x2 dés)' : ''}
              </div>
              <div
                className="tabular-nums"
                style={{ fontSize: '1.15rem', fontWeight: 700 }}
              >
                {lastDamage.formulaBreakdown}
              </div>
            </div>
          )}
        </div>

        {/* Journal compact des jets de la séance */}
        {rollLog.length > 0 && (
          <div className="roll-log-section">
            <div className="inventory-header-row">
              <span className="muted-note">
                <strong>Historique de séance ({rollLog.length})</strong>
              </span>
              <button
                type="button"
                className="action-btn"
                onClick={() => {
                  setLastD20(null);
                  setLastDamage(null);
                  onClearRollLog();
                }}
              >
                Effacer
              </button>
            </div>
            <div className="roll-log-list">
              {rollLog.map((entry) => (
                <div key={entry.id} className="roll-log-item">
                  <div>
                    <strong>{entry.title}</strong>{' '}
                    <span className="muted-note">({entry.subtitle})</span>
                  </div>
                  <div className="tabular-nums" style={{ fontWeight: 700 }}>
                    {entry.formulaBreakdown}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
