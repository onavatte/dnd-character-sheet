# Journal des Décisions (`DECISIONS.md`)

Journal des décisions techniques et architecturales (format ADR allégé). Les plus récentes en bas.

| Date | Décision | Raison / conséquences |
|---|---|---|
| 2026-11-11 | **Architecture v1 100 % Client Local-First (PWA) + Contrat de dépôt abstrait** | Permet un fonctionnement immédiat hors-ligne à la table (RTO = 0) sans coût de maintenance serveur initial, tout en préparant dès le Jalon 2 l'interface `CharacterRepository` pour brancher ultérieurement la synchronisation Homelab via VPN WireGuard et reverse proxy Nginx. |
| 2026-11-11 | **Calculateur D&D 5e (2014) automatisé à saisie libre & Homebrew** | Toutes les formules mathématiques 5e (modificateurs, maîtrise, CA, DD, repos) sont automatisées, mais les compétences, armes et capacités restent librement éditables pour supporter une campagne D&D moderne / post-apocalyptique. Un compendium complet est placé au Parking Lot (v2). |
| 2026-11-11 | **Assistant de Jet Hybride (Dé physique + Jet virtuel)** | Respecte l'usage des dés physiques à la table (saisie rapide du score du dé `1-20` et calcul automatique avec tous les bonus) tout en offrant le tirage virtuel instantané en un clic. |
| 2026-11-11 | **Double mode d'interface instantané : Mode Partie (Cockpit) vs Mode Édition (Forge)** | Disponible sur tous les supports (Laptop/PC et Tablette) via un simple commutateur d'affichage sur le même état en mémoire : permet de jouer en sécurité en *Mode Cockpit* (zéro suppression accidentelle) et de basculer à tout moment en *Mode Forge* (même en pleine partie) pour modifier la fiche ou ajouter un objet. |
| 2026-11-11 | **Moteur métier TS pur découplé + Zustand/Immer + IndexedDB** | Seules les valeurs sources sont stockées ; les valeurs dérivées sont calculées à la volée par `src/engine/`. `Zustand` + `Immer` fournit le *Copy-on-Write* en RAM pour l'Undo/Redo, et `IndexedDB` stocke les fiches et les snapshots locaux sans bloquer le thread UI. |
| 2026-11-11 | **Interface en français + Lexique métier D&D 5e bilingue (FR/EN)** | Pas de bibliothèque i18n lourde pour l'UI, mais dictionnaire FR/EN natif (`src/engine/glossary.ts`) pour les caractéristiques, compétences et états 5e + champ `originalName` optionnel sur les sorts/armes/objets et recherche croisée FR/EN. |
| 2026-11-12 | **Séparation Fiche / Administration Système & Assistant de Jet Flottant Déplaçable Multi-Dés** | L'administration technique (Snapshots IndexedDB, Export/Import JSON, statut de révision, thème et langue) est isolée dans une modale `Système` (icône Engrenage). L'Assistant de Jet Hybride quitte la grille principale (qui passe en 2 larges colonnes sans débordement sur tablette) pour devenir une fenêtre flottante non-modale déplaçable sans flou d'arrière-plan, accessible au clic sur n'importe quel jet ou via un bouton flottant permanent (FAB), et adaptée à tous les dés (`d4`, `d6`, `d8`, `d10`, `d12`, `d20`, `d100`) pour les tests, les dégâts et les jets libres. |
| 2026-11-12 | **Extension rétrocompatible des sorts/cantrips pour l'attaque et les dégâts** | Ajout de champs optionnels (`hasAttackRoll`, `saveAbility`, `damageFormula`, `damageType`) sur `SpellAbilityEntry` dans le schéma `CharacterSheetV1`. Les fiches JSON et sauvegardes IndexedDB existantes restent 100 % compatibles sans incrémenter `schemaVersion`, tout en permettant de lancer les jets de toucher (`1d20 + X`), les dégâts/soins et les critiques directement depuis l'onglet Sorts & Capacités. |

---

## Stratégie d'usage des modèles IA

| Phase | Modèle conseillé |
|---|---|
| Specs, architecture, décisions de fond, modélisation complexe, revue de sécurité | Modèle de raisonnement avancé (Pro / Opus / Argon) |
| Moteur métier (TDD), composants UI complexes, gestion d'état IndexedDB / Undo-Redo | Modèle équilibré / avancé (Sonnet / Pro / Argon) |
| Débogage subtil ou problème d'architecture | Modèle de raisonnement avancé si le modèle courant échoue après 2 essais |
| Thème CSS, composants de présentation simples, tests unitaires additionnels, documentation | Modèle rapide (Flash) |

Les tests unitaires Vitest du moteur métier (`src/engine/`) et le typage TypeScript strict servent de filet de sécurité lors d'un changement de modèle.

---

## Sécurité
- Dépôt GitHub **privé** par défaut, branche `main`.
- Aucune donnée sensible dans Git (clés d'API, jetons, mots de passe, adresses internes, `.env`). `.gitignore` exclut `.env*`, `*.pem`, `*.key`.
- Validation stricte de schéma sur tous les fichiers `.json` importés.
- Un jalon dédié de **Hardening** (Jalon 5) clôture le backlog avant usage définitif.
