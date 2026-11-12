import { useEffect, useState } from 'react';
import {
  ABILITY_GLOSSARY,
  applyDamage,
  applyHealing,
  applyLongRest,
  applyShortRest,
  computeDerivedCharacter,
  createDemoCharacter,
  formatSignedModifier,
  matchesBilingualSearch,
  resolveDamageRoll,
  resolvePhysicalD20Check,
  rollVirtualD20Check,
  setTemporaryHp,
  updateResourceCurrent,
} from '../engine';
import type {
  AdvantageState,
  CharacterSheetV1,
  D20Resolution,
  DamageResolution,
  TermDisplayMode,
  ThemeMode,
} from '../engine';

type SheetMode = 'cockpit' | 'forge';

function getInitialTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function App() {
  const [sheet, setSheet] = useState<CharacterSheetV1>(() => createDemoCharacter());
  const [sheetMode, setSheetMode] = useState<SheetMode>('cockpit');
  const [termMode, setTermMode] = useState<TermDisplayMode>('bilingual');
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  const [skillQuery, setSkillQuery] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState<string>('stealth');
  const [advantage, setAdvantage] = useState<AdvantageState>('normal');
  const [lastD20Result, setLastD20Result] = useState<D20Resolution | null>(null);
  const [lastDamageResult, setLastDamageResult] = useState<DamageResolution | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    if (meta) {
      meta.content = theme;
    }
    try {
      localStorage.setItem('color-scheme', theme);
    } catch {
      // Ignore storage restrictions
    }
  }, [theme]);

  const derived = computeDerivedCharacter(sheet);

  const renderTerm = (fr: string, en?: string) => {
    if (!en || termMode === 'fr') return <span>{fr}</span>;
    if (termMode === 'en') return <span lang="en">{en}</span>;
    return (
      <span>
        {fr}{' '}
        <span className="original-term" lang="en">
          ({en})
        </span>
      </span>
    );
  };

  const filteredSkills = derived.skills.filter((skill) =>
    matchesBilingualSearch(skill, skillQuery),
  );

  const activeSkill =
    derived.skills.find((s) => s.id === selectedSkillId) ?? derived.skills[0];

  const handlePhysicalDieClick = (dieValue: number) => {
    if (!activeSkill) return;
    const secondaryDie =
      advantage === 'normal'
        ? undefined
        : Math.max(1, Math.min(20, 21 - dieValue));
    const res = resolvePhysicalD20Check({
      label: activeSkill.name,
      primaryDie: dieValue,
      ...(secondaryDie !== undefined ? { secondaryDie } : {}),
      advantage,
      modifier: activeSkill.modifier,
    });
    setLastD20Result(res);
  };

  const handleVirtualRoll = () => {
    if (!activeSkill) return;
    const res = rollVirtualD20Check({
      label: activeSkill.name,
      advantage,
      modifier: activeSkill.modifier,
    });
    setLastD20Result(res);
  };

  const handleDamageTest = (isCritical: boolean) => {
    const primaryAttack = derived.attacks[0];
    if (!primaryAttack) return;
    const dmg = resolveDamageRoll(primaryAttack.damageFormula, { isCritical });
    setLastDamageResult(dmg);
  };

  const hpRatio = sheet.combat.hpCurrent / sheet.combat.hpMax;
  const hpColorClass =
    hpRatio <= 0.25
      ? 'vital-value--hp-crit'
      : hpRatio <= 0.5
        ? 'vital-value--hp-warn'
        : 'vital-value--hp-ok';

  return (
    <div className="app-shell">
      <header className="sheet-header">
        <div className="identity-block">
          <div className="portrait-frame" aria-hidden="true">
            KV
          </div>
          <div className="identity-text">
            <h1>{sheet.identity.name}</h1>
            <p className="identity-subtitle">
              {sheet.identity.classes.map((cls) => (
                <span key={cls.id} className="badge-pill">
                  {renderTerm(cls.name, cls.originalName)} {cls.level}
                </span>
              ))}
              <span className="badge-pill tabular-nums">
                Niveau global {derived.totalLevel}
              </span>
              <span className="badge-pill tabular-nums">
                Maîtrise {formatSignedModifier(derived.proficiencyBonus)}
              </span>
              <span className="badge-pill tabular-nums">
                Révision #{sheet.revision}
              </span>
            </p>
          </div>
        </div>

        <div
          className="toolbar-controls"
          role="toolbar"
          aria-label="Contrôles d'affichage de la fiche"
        >
          <div className="segmented-control" role="group" aria-label="Mode de la fiche">
            <button
              type="button"
              className="segmented-btn"
              aria-pressed={sheetMode === 'cockpit'}
              onClick={() => setSheetMode('cockpit')}
            >
              Mode Partie (Cockpit)
            </button>
            <button
              type="button"
              className="segmented-btn"
              aria-pressed={sheetMode === 'forge'}
              onClick={() => setSheetMode('forge')}
            >
              Mode Édition (Forge)
            </button>
          </div>

          <div
            className="segmented-control"
            role="group"
            aria-label="Langue des termes D&D 5e"
          >
            <button
              type="button"
              className="segmented-btn"
              aria-pressed={termMode === 'bilingual'}
              onClick={() => setTermMode('bilingual')}
            >
              FR · EN
            </button>
            <button
              type="button"
              className="segmented-btn"
              aria-pressed={termMode === 'fr'}
              onClick={() => setTermMode('fr')}
            >
              FR
            </button>
            <button
              type="button"
              className="segmented-btn"
              aria-pressed={termMode === 'en'}
              onClick={() => setTermMode('en')}
            >
              EN
            </button>
          </div>

          <button
            type="button"
            className="action-btn"
            onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
          >
            Thème : {theme === 'light' ? 'Clair (Ivoire)' : 'Sombre (Obsidienne)'}
          </button>
        </div>
      </header>

      <main className="workspace-grid">
        {/* Colonne 1 : Survie, Ressources & Repos (rest.ts + calculators.ts) */}
        <section className="grimoire-card" aria-labelledby="section-survival-title">
          <h2 id="section-survival-title">
            1. Survie, Ressources & Repos (Moteur Jalon 1)
          </h2>

          <div className="vitals-grid">
            <div className="vital-box">
              <span className="vital-label">Points de Vie</span>
              <span className={`vital-value tabular-nums ${hpColorClass}`}>
                {sheet.combat.hpCurrent} / {sheet.combat.hpMax}
              </span>
            </div>
            <div className="vital-box">
              <span className="vital-label">PV Temp.</span>
              <span className="vital-value vital-value--arcane tabular-nums">
                +{sheet.combat.hpTemp}
              </span>
            </div>
            <div className="vital-box">
              <span className="vital-label">Classe d’Armure</span>
              <span className="vital-value tabular-nums">{derived.armorClass}</span>
            </div>
            <div className="vital-box">
              <span className="vital-label">Initiative</span>
              <span className="vital-value tabular-nums">
                {formatSignedModifier(derived.initiative)}
              </span>
            </div>
            <div className="vital-box">
              <span className="vital-label">Dés de Vie d10</span>
              <span className="vital-value tabular-nums">
                {sheet.combat.hitDicePools[10].available}/
                {sheet.combat.hitDicePools[10].total}
              </span>
            </div>
            <div className="vital-box">
              <span className="vital-label">Dés de Vie d8</span>
              <span className="vital-value tabular-nums">
                {sheet.combat.hitDicePools[8].available}/
                {sheet.combat.hitDicePools[8].total}
              </span>
            </div>
          </div>

          <div className="button-cluster">
            <button
              type="button"
              className="action-btn"
              onClick={() => setSheet((prev) => applyDamage(prev, 6))}
            >
              Dégâts -6
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={() => setSheet((prev) => applyDamage(prev, 15))}
            >
              Dégâts -15
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={() => setSheet((prev) => applyHealing(prev, 8))}
            >
              Soin +8
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={() => setSheet((prev) => setTemporaryHp(prev, 6))}
            >
              PV Temp +6
            </button>
          </div>

          {sheet.resources.map((res) => (
            <div key={res.id} className="stat-preview-row">
              <div>
                <strong>{renderTerm(res.name, res.originalName)}</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Récupération :{' '}
                  {res.recovery === 'short_rest'
                    ? 'Repos Court'
                    : res.recovery === 'long_rest'
                      ? 'Repos Long'
                      : 'Manuelle'}
                </div>
              </div>
              <div className="button-cluster" style={{ alignItems: 'center' }}>
                <span className="tabular-nums" style={{ fontWeight: 700 }}>
                  {res.current} / {res.max}
                </span>
                <button
                  type="button"
                  className="action-btn"
                  onClick={() =>
                    setSheet((prev) => updateResourceCurrent(prev, res.id, -1))
                  }
                >
                  -1
                </button>
                <button
                  type="button"
                  className="action-btn"
                  onClick={() =>
                    setSheet((prev) => updateResourceCurrent(prev, res.id, 1))
                  }
                >
                  +1
                </button>
              </div>
            </div>
          ))}

          <div className="button-cluster">
            <button
              type="button"
              className="action-btn action-btn--primary"
              onClick={() =>
                setSheet((prev) =>
                  applyShortRest(prev, {
                    hitDiceSpent: { 10: 1 },
                    healingRolled: 9,
                  }),
                )
              }
            >
              Repos Court (-1d10, +9 PV)
            </button>
            <button
              type="button"
              className="action-btn action-btn--primary"
              onClick={() => setSheet((prev) => applyLongRest(prev))}
            >
              Repos Long (Reset 5e)
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={() => setSheet(createDemoCharacter())}
            >
              Réinitialiser Démo
            </button>
          </div>
        </section>

        {/* Colonne 2 : Compétences & Recherche Bilingue FR/EN */}
        <section className="grimoire-card" aria-labelledby="section-skills-title">
          <h2 id="section-skills-title">
            2. Compétences & Filtre Bilingue ({filteredSkills.length}/
            {derived.skills.length})
          </h2>

          <search>
            <div className="field-group">
              <label htmlFor="skill-search-input">
                Rechercher en français ou anglais (ex. Stealth, Discrétion, Hacking)
              </label>
              <input
                id="skill-search-input"
                name="skill-search"
                type="search"
                value={skillQuery}
                onChange={(e) => setSkillQuery(e.target.value)}
                placeholder="Ex. sleight, escamotage, hacking..."
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>
          </search>

          <div className="skill-list" role="group" aria-label="Liste des compétences">
            {filteredSkills.map((skill) => {
              const abilityMeta = ABILITY_GLOSSARY[skill.ability];
              const profBadge =
                skill.proficiency === 'expertise'
                  ? '★★'
                  : skill.proficiency === 'proficient'
                    ? '★'
                    : skill.proficiency === 'half'
                      ? '½'
                      : '·';
              return (
                <button
                  key={skill.id}
                  type="button"
                  className="skill-btn"
                  aria-pressed={activeSkill?.id === skill.id}
                  onClick={() => setSelectedSkillId(skill.id)}
                >
                  <span>
                    <strong className="tabular-nums" style={{ marginRight: '0.5rem' }}>
                      {profBadge}
                    </strong>
                    {renderTerm(skill.name, skill.originalName)}{' '}
                    <span
                      style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
                    >
                      [{termMode === 'en' ? abilityMeta.abbrEn : abilityMeta.abbrFr}]
                    </span>
                  </span>
                  <span className="tabular-nums" style={{ fontWeight: 700 }}>
                    {formatSignedModifier(skill.modifier)} (Passif {skill.passive})
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Colonne 3 : Assistant de Jet Hybride (Dé physique & Tirage virtuel) */}
        <section className="grimoire-card" aria-labelledby="section-dice-title">
          <h2 id="section-dice-title">
            3. Assistant de Jet Hybride (Physique & Virtuel)
          </h2>

          {activeSkill && (
            <div className="stat-preview-row">
              <span>
                Jet sélectionné :{' '}
                <strong>{renderTerm(activeSkill.name, activeSkill.originalName)}</strong>
              </span>
              <span className="badge-pill tabular-nums">
                1d20 {formatSignedModifier(activeSkill.modifier)}
              </span>
            </div>
          )}

          <div
            className="segmented-control"
            role="group"
            aria-label="Mode d'avantage du jet"
          >
            <button
              type="button"
              className="segmented-btn"
              aria-pressed={advantage === 'normal'}
              onClick={() => setAdvantage('normal')}
            >
              Normal
            </button>
            <button
              type="button"
              className="segmented-btn"
              aria-pressed={advantage === 'advantage'}
              onClick={() => setAdvantage('advantage')}
            >
              Avantage
            </button>
            <button
              type="button"
              className="segmented-btn"
              aria-pressed={advantage === 'disadvantage'}
              onClick={() => setAdvantage('disadvantage')}
            >
              Désavantage
            </button>
          </div>

          <div className="field-group">
            <label id="physical-keypad-label">
              Option A — Touchez le score obtenu sur votre vrai dé d20 physique :
            </label>
            <div
              className="d20-keypad"
              role="group"
              aria-labelledby="physical-keypad-label"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`d20-key tabular-nums ${
                    val === 20 ? 'd20-key--crit' : val === 1 ? 'd20-key--fumble' : ''
                  }`}
                  onClick={() => handlePhysicalDieClick(val)}
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
              onClick={handleVirtualRoll}
            >
              Option B — Lancer 1d20 Virtuel
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={() => handleDamageTest(false)}
            >
              Dégâts Carabine (1d10 + 5)
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={() => handleDamageTest(true)}
            >
              Dégâts Critiques (2d10 + 5)
            </button>
          </div>

          <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {lastD20Result && (
              <div className="roll-banner">
                <div>
                  <strong>{lastD20Result.label}</strong> (
                  {lastD20Result.mode === 'physical' ? 'Dé physique' : 'Jet virtuel'})
                  {lastD20Result.isCriticalSuccess && ' — RÉUSSITE CRITIQUE (20) !'}
                  {lastD20Result.isCriticalFailure && ' — ÉCHEC CRITIQUE (1) !'}
                </div>
                <div className="tabular-nums" style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                  {lastD20Result.formulaBreakdown}
                </div>
              </div>
            )}

            {lastDamageResult && (
              <div className="roll-banner">
                <div>
                  <strong>Carabine magnétique M4</strong>{' '}
                  {lastDamageResult.isCritical ? '(Critique x2 dés)' : '(Dégâts normaux)'}
                </div>
                <div className="tabular-nums" style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                  {lastDamageResult.formulaBreakdown}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
