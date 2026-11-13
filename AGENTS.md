# Grimoire 5e - Règles et Contexte pour les Agents

Application web Local-First (PWA) de fiche de personnage Donjons & Dragons 5e (édition 2014 + adaptations modernes/post-apo), pensée pour un usage fluide à la table de jeu comme en préparation, sur **PC/Laptop et Tablette**.
Lire d'abord : [`docs/SPECS.md`](docs/SPECS.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/BACKLOG.md`](docs/BACKLOG.md), [`docs/DECISIONS.md`](docs/DECISIONS.md).

---

## 1. Méthode de travail (Non Négociable)
- L'utilisateur (architecte UI/UX, à l'aise avec Angular/React, ex-architecte infra stockage/backup) veut **apprendre et garder le contrôle du rythme**.
- **Workflow strict en 6 étapes après chaque tâche** :
  1. Expliquer chaque étape **avant** de coder (quoi, pourquoi, alternatives) et attendre l'accord.
  2. Effectuer les modifications de fichiers et **s'arrêter** : ne jamais exécuter `git add`, `git commit` ou `git push` dans le même tour que l'édition de fichiers. Attendre que l'utilisateur approuve les diffs.
  3. Lancer les vérifications (`npm test`, `npm run lint`, `npm run build`), puis **proposer de commiter et pousser**.
  4. Après accord explicite, commiter et pousser sur `main`.
  5. **Attendre que l'utilisateur teste réellement les modifications** (desktop/tablette) et donne ses retours.
  6. **Ne jamais enchaîner directement sur l'étape suivante** tant que l'utilisateur n'a pas validé son test.
- Répondre en **français**. Rester concis. Zéro émoticône décoratif (uniquement `✅`, `⏳`, `[x]`, `[ ]`).
- Travailler jalon par jalon (voir [`docs/BACKLOG.md`](docs/BACKLOG.md)). À la fin d'un jalon : cocher le backlog, mettre à jour [`docs/DECISIONS.md`](docs/DECISIONS.md) et [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) si le design a évolué.
- Ne pas ajouter de dépendance externe sans en discuter. Ne pas élargir le périmètre hors de [`docs/SPECS.md`](docs/SPECS.md).

---

## 2. Commandes
- `npm run dev` : serveur de développement Vite
- `npm test` : tests unitaires (Vitest)
- `npm run lint` : vérification statique (ESLint / Oxlint)
- `npm run build` : build de production et vérification des types TypeScript (`tsc -b`)

Avant tout commit : lint, tests et build doivent passer sans erreur.

---

## 3. Architecture & Découplage
- `src/engine/` : TypeScript pur. **Aucun import de React, du DOM, de `window` ni de la couche de stockage.** Fonctions pures déterministes (calcul des modificateurs 5e, compétences, CA, DD de sorts, mécanique de repos court/long, assistant de résolution de jets) et états immuables, développés en TDD (`*.test.ts`).
- `src/state/` : Gestion de l'état en mémoire (`Zustand` + `Immer`), pile d'annulation Undo/Redo, interface abstraite `CharacterRepository`, persistance locale `IndexedDB` (personnages et snapshots) et export/import de sauvegardes JSON.
- `src/ui/` : Composants visuels React, modes d'affichage (*Cockpit de Partie* vs *Forge d'Édition*), accessibilité et micro-interactions tactiles.
- `src/theme/` : Design Tokens via variables CSS (`--*`), typographie et double thème *Grimoire Moderne* (Thème Clair *Ivoire & Encre* par défaut + Thème Sombre *Obsidienne & Or*).

---

## 4. Discipline de Sécurité & Garde-Fous
1. **Contrôle pré-commit des secrets (Leak Prevention)** :
   - **Règle absolue** : Ne jamais commiter de clé d'API, jeton, mot de passe, certificat, adresse interne sensible, fichier `.env` ou donnée personnelle.
   - Avant tout `git add` / `git commit`, vérifier `git status` et `git diff --staged`.
   - Maintenir `.env.example` avec des valeurs fictives (`<VOTRE_CLE>`) dès qu'une variable d'environnement est introduite.
2. **Pas de secret côté client** :
   - Aucun secret en dur dans le code client Vite (le bundler l'exposerait en clair).
3. **Sécurité des Données & Préparation Homelab** :
   - Validation stricte du schéma lors de tout import de fichier `.json` ou synchronisation externe (prévention d'injection XSS et de corruption d'état).
   - En-têtes de sécurité (CSP stricte) et préparation propre pour la future synchronisation via VPN WireGuard / Reverse Proxy Nginx.
4. **En cas de fuite accidentelle** :
   - Révoquer immédiatement le secret chez le fournisseur ou sur le homelab avant de nettoyer l'historique Git.

---

## 5. Conventions de Code & Git
- **TypeScript** : `strict: true` + `noUncheckedIndexedAccess: true` (zéro `any`).
- **Langue** : Interface en français (textes en dur, pas de bibliothèque i18n), commentaires et documentation en français.
- **Typographie** : Interdiction d'utiliser le tiret quadratin (`U+2014`) et le demi-quadratin (`U+2013`) dans les titres, le texte courant, les échanges, les commentaires et l'UI. Remplacer systématiquement par deux-points (`:`), virgules, parenthèses ou tiret ASCII normal (`-`) selon le contexte.
- **Commits Git** : En français, en minuscules, au format Conventional Commits (`docs: ...`, `feat: ...`, `fix: ...`, `refactor: ...`, `chore: ...`). Branche unique `main` sur dépôt GitHub privé.

---

## 6. Outils & Skills Utiles
- Skill `modern-web-guidance` : à consulter systématiquement avant d'implémenter des composants HTML/CSS modernes (dialogs, popovers, CSS Grid, container queries).
- MCP `context7` : vérifier l'API des bibliothèques récentes avant de coder.
- MCP `chrome-devtools` : inspecter le rendu, la console, le responsive Tablette/Desktop et exécuter des audits Lighthouse.
- Skills `a11y-debugging` et `debug-optimize-lcp` pour la qualité UI, l'accessibilité et la performance.
