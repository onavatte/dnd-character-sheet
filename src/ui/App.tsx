import { useEffect, useState } from 'react';
import { computeAbilityModifier, formatSignedModifier } from '../engine/smoke';

type SheetMode = 'cockpit' | 'forge';
type TermDisplayMode = 'bilingual' | 'fr' | 'en';
type ThemeMode = 'light' | 'dark';

function getInitialTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function App() {
  const [sheetMode, setSheetMode] = useState<SheetMode>('cockpit');
  const [termMode, setTermMode] = useState<TermDisplayMode>('bilingual');
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

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

  const dexScore = 18;
  const dexMod = computeAbilityModifier(dexScore);

  const renderTerm = (fr: string, en: string) => {
    if (termMode === 'fr') return <span>{fr}</span>;
    if (termMode === 'en') return <span>{en}</span>;
    return (
      <span>
        {fr} <span className="original-term">({en})</span>
      </span>
    );
  };

  return (
    <div className="app-shell">
      <header className="sheet-header">
        <div className="identity-block">
          <div
            className="portrait-frame"
            title="Emplacement du portrait du personnage (Upload au Jalon 4)"
            aria-label="Portrait de Kaelen Vance"
          >
            KV
          </div>
          <div className="identity-text">
            <h1>Kaelen Vance</h1>
            <p className="identity-subtitle">
              <span className="badge-pill">
                {renderTerm('Rôdeur', 'Ranger')} 5 / {renderTerm('Roublard', 'Rogue')} 2
              </span>
              <span className="badge-pill tabular-nums">Niveau global 7</span>
              <span className="badge-pill tabular-nums">Maîtrise +3</span>
            </p>
          </div>
        </div>

        <div className="toolbar-controls" role="toolbar" aria-label="Contrôles d'affichage de la fiche">
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

          <div className="segmented-control" role="group" aria-label="Langue des termes D&D 5e">
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
            className="theme-btn"
            onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            aria-label={
              theme === 'light'
                ? 'Passer au thème sombre (Obsidienne & Or)'
                : 'Passer au thème clair (Ivoire & Encre)'
            }
          >
            Thème : {theme === 'light' ? 'Clair (Ivoire)' : 'Sombre (Obsidienne)'}
          </button>
        </div>
      </header>

      <main className="workspace-grid">
        <section className="grimoire-card" aria-labelledby="section-mode-title">
          <h2 id="section-mode-title">
            {sheetMode === 'cockpit'
              ? 'Cockpit de Partie — Verrouillage Tactile Actif'
              : "Forge d'Édition — Construction & Ajustements à la volée"}
          </h2>
          <p>
            {sheetMode === 'cockpit'
              ? 'En Mode Partie, la structure de la fiche est protégée contre les suppressions accidentelles. Les actions de combat, PV, munitions, sorts et repos restent accessibles en un clic.'
              : "En Mode Édition, vous pouvez modifier librement les classes (multi-classage), uploader le portrait du personnage, ajuster les caractéristiques ou ajouter des compétences et armes post-apo."}
          </p>
        </section>

        <section className="grimoire-card" aria-labelledby="section-tokens-title">
          <h2 id="section-tokens-title">Aperçu Typographique & Lexique Bilingue</h2>
          <div className="stat-preview-row">
            <strong>{renderTerm('Dextérité', 'Dexterity')}</strong>
            <span className="tabular-nums">
              Score {dexScore} ({formatSignedModifier(dexMod)})
            </span>
          </div>
          <div className="stat-preview-row">
            <strong>{renderTerm('Escamotage', 'Sleight of Hand')}</strong>
            <span className="tabular-nums">{formatSignedModifier(dexMod + 3)}</span>
          </div>
          <div className="stat-preview-row">
            <strong>{renderTerm('Foulée brumeuse', 'Misty Step')}</strong>
            <span className="tabular-nums">Niveau 2 · Action bonus</span>
          </div>
        </section>
      </main>
    </div>
  );
}
