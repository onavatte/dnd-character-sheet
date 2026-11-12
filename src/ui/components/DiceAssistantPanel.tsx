import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  formatSignedModifier,
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
  activeTarget: ActiveRollTarget;
  rollLog: RollLogEntry[];
  renderTerm: (fr: string, en?: string) => ReactNode;
  onPushRollLog: (entry: RollLogEntry) => void;
  onClearRollLog: () => void;
}

export function DiceAssistantPanel({
  activeTarget,
  rollLog,
  renderTerm,
  onPushRollLog,
  onClearRollLog,
}: DiceAssistantPanelProps) {
  const [advantage, setAdvantage] = useState<AdvantageState>('normal');
  const [pendingFirstDie, setPendingFirstDie] = useState<number | null>(null);
  const [lastD20, setLastD20] = useState<D20Resolution | null>(null);
  const [lastDamage, setLastDamage] = useState<DamageResolution | null>(null);

  const nowTime = () =>
    new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  const handlePhysicalTap = (dieValue: number) => {
    if (advantage !== 'normal' && pendingFirstDie === null) {
      setPendingFirstDie(dieValue);
      return;
    }

    const primaryDie = pendingFirstDie ?? dieValue;
    const secondaryDie = pendingFirstDie !== null ? dieValue : undefined;
    setPendingFirstDie(null);

    const res = resolvePhysicalD20Check({
      label: activeTarget.label,
      primaryDie,
      ...(secondaryDie !== undefined ? { secondaryDie } : {}),
      advantage,
      modifier: activeTarget.modifier,
    });
    setLastD20(res);

    onPushRollLog({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowTime(),
      title: activeTarget.label,
      subtitle:
        advantage === 'normal'
          ? 'Dé physique'
          : advantage === 'advantage'
            ? 'Dé physique (Avantage)'
            : 'Dé physique (Désavantage)',
      formulaBreakdown: res.formulaBreakdown,
      isCritSuccess: res.isCriticalSuccess,
      isCritFailure: res.isCriticalFailure,
    });
  };

  const handleVirtualD20 = () => {
    setPendingFirstDie(null);
    const res = rollVirtualD20Check({
      label: activeTarget.label,
      advantage,
      modifier: activeTarget.modifier,
    });
    setLastD20(res);

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

  const handleDamageRoll = (isCritical: boolean) => {
    if (!activeTarget.damageFormula) return;
    const dmg = resolveDamageRoll(activeTarget.damageFormula, { isCritical });
    setLastDamage(dmg);

    onPushRollLog({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowTime(),
      title: `${activeTarget.label} — Dégâts`,
      subtitle: isCritical
        ? `Critique (${activeTarget.damageType ?? ''})`
        : `Normal (${activeTarget.damageType ?? ''})`,
      formulaBreakdown: dmg.formulaBreakdown,
    });
  };

  return (
    <section
      className="grimoire-card"
      aria-labelledby="cockpit-dice-assistant-title"
    >
      <h2 id="cockpit-dice-assistant-title">
        Assistant de Jet Hybride (Physique & Virtuel)
      </h2>

      {/* En-tête du jet sélectionné */}
      <div className="stat-preview-row">
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Jet actif sélectionné :
          </span>
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

      {/* Sélecteur Normal / Avantage / Désavantage */}
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
            setPendingFirstDie(null);
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
            setPendingFirstDie(null);
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
            setPendingFirstDie(null);
          }}
        >
          Désavantage (2d20↓)
        </button>
      </div>

      {/* Pavé 1-20 pour saisir le vrai dé physique */}
      <div className="field-group">
        <label id="cockpit-physical-keypad-label">
          {advantage === 'normal'
            ? 'Option A — Touchez le score obtenu sur votre vrai d20 physique :'
            : pendingFirstDie === null
              ? 'Option A — Touchez le 1er dé d20 physique obtenu :'
              : `1er dé = ${pendingFirstDie} — Touchez maintenant le 2e dé d20 physique :`}
        </label>
        <div
          className="d20-keypad"
          role="group"
          aria-labelledby="cockpit-physical-keypad-label"
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
              onClick={() => handlePhysicalTap(val)}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      {/* Boutons Jet Virtuel + Dégâts si arme */}
      <div className="button-cluster">
        <button
          type="button"
          className="action-btn action-btn--primary"
          onClick={handleVirtualD20}
        >
          Option B — Lancer 1d20 Virtuel
        </button>

        {activeTarget.damageFormula && (
          <>
            <button
              type="button"
              className="action-btn tabular-nums"
              onClick={() => handleDamageRoll(false)}
            >
              Dégâts ({activeTarget.damageFormula})
            </button>
            <button
              type="button"
              className="action-btn tabular-nums"
              onClick={() => handleDamageRoll(true)}
            >
              Dégâts Critiques
            </button>
          </>
        )}
      </div>

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
              <strong>Dégâts</strong>{' '}
              {lastDamage.isCritical ? '(Critique x2 dés)' : '(Normaux)'}
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

      {/* Journal des derniers jets de la séance */}
      <div className="roll-log-section">
        <div className="inventory-header-row">
          <h3>Journal des Jets ({rollLog.length})</h3>
          {rollLog.length > 0 && (
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
          )}
        </div>

        {rollLog.length === 0 ? (
          <p className="muted-note">
            Aucun jet enregistré durant cette séance. Touchez une compétence,
            une sauvegarde ou une attaque puis utilisez le pavé 1–20 ou le jet
            virtuel.
          </p>
        ) : (
          <div className="roll-log-list">
            {rollLog.map((entry) => (
              <div key={entry.id} className="roll-log-item">
                <div>
                  <strong>{entry.title}</strong>{' '}
                  <span className="muted-note">
                    ({entry.subtitle} · {entry.timestamp})
                  </span>
                </div>
                <div className="tabular-nums" style={{ fontWeight: 700 }}>
                  {entry.formulaBreakdown}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
