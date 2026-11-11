# Grimoire 5e (`dnd-character-sheet`)

Application web Local-First (PWA) de fiche de personnage **Donjons & Dragons 5e (édition 2014)** avec support natif du **multi-classage**, du **lexique bilingue FR/EN** et d'adaptations **modernes / post-apocalyptiques** (*Homebrew*).

Conçue pour un usage fluide aussi bien sur **PC/Laptop** que sur **Tablette**, à la table de jeu comme en préparation.

---

## Documentation Maîtresse

- [AGENTS.md](AGENTS.md) — Règles de travail, conventions et garde-fous de sécurité
- [docs/SPECS.md](docs/SPECS.md) — Spécifications fonctionnelles, parcours UX et Design System (*Ivoire & Encre* / *Obsidienne & Or*)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Architecture découplée (`src/engine/`, `src/state/`, `src/ui/`), modèle TypeScript et persistance multi-tiers
- [docs/BACKLOG.md](docs/BACKLOG.md) — Feuille de route par jalons et Parking Lot (Synchronisation Homelab WireGuard/Nginx & Compendium)
- [docs/DECISIONS.md](docs/DECISIONS.md) — Journal des décisions d'architecture (ADR)

---

## Commandes (à partir du Jalon 0)

- `npm run dev` : Serveur de développement Vite
- `npm test` : Tests unitaires du moteur métier (Vitest)
- `npm run lint` : Analyse statique du code
- `npm run build` : Vérification des types TypeScript et build de production
