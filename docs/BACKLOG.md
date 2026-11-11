# Backlog — Grimoire 5e

Légende : `[x]` fait, `[ ]` à faire, `✅` jalon terminé, `⏳` jalon en cours.

## Jalon 0 — Fondations, Outillage & Design System ("Grimoire Tactique" Clair / Sombre)
- **Focus d'apprentissage** : Configuration d'une base React 19 + TypeScript ultra-stricte et architecture de Design Tokens CSS bi-thème (Thème Clair *Ivoire & Encre* par défaut + Thème Sombre *Obsidienne & Or*).
- **Critère de validation** : `npm test`, `npm run lint` et `npm run build` passent sans erreur ; la coquille applicative (App Shell) affiche la typographie, la bascule de thème Clair/Sombre et le sélecteur de mode (*Cockpit* / *Forge*) sur Desktop et Tablette.
- [ ] Initialisation du projet Vite + React 19 + TypeScript (`strict`, `noUncheckedIndexedAccess`), ESLint et Vitest
- [ ] Création du système de Design Tokens CSS bi-thème (`src/theme/tokens.css`, `base.css`) : Thème Clair par défaut + Thème Sombre, typographie tabulaire pour les chiffres, cibles tactiles >= 44 px
- [ ] Mise en place de l'App Shell responsive (en-tête d'identité du personnage, barre d'état rapide, bascule Mode Partie / Mode Édition et commutateur de thème Clair / Sombre)

## Jalon 1 — Moteur de Règles D&D 5e Pur & Adaptations Post-Apo (TDD)
- **Focus d'apprentissage** : Séparation stricte entre données sources stockées et données dérivées calculées à la volée ; développement piloté par les tests (TDD) en TypeScript pur.
- **Critère de validation** : 100 % des tests unitaires de `src/engine/` passent avec `npm test` (modificateurs, maîtrise, compétences personnalisées, CA, DD, repos court/long, assistant de jets).
- [ ] Définition des types du domaine versionnés (`src/engine/types.ts`), du lexique bilingue FR/EN (`src/engine/glossary.ts` : 6 caractéristiques, 18 compétences 5e, conditions, recherche bilingue) et d'un personnage de référence complet (fixture de test / démo)
- [ ] Implémentation des calculateurs purs (`src/engine/calculators.ts` + tests) : niveau global multi-classes, modificateurs, bonus de maîtrise, sauvegardes, compétences (standard 5e + compétences personnalisées post-apo), CA, initiative, Perception passive, DD de sorts par classe
- [ ] Implémentation de la machine à états des ressources et repos (`src/engine/rest.ts` + tests) : dégâts/soins avec absorption par PV temporaires, jets contre la mort, Repos Court (dépense par pool de Dés de Vie `d6`/`d8`/`d10`/`d12` et emplacements de Pacte) et Repos Long
- [ ] Implémentation du moteur de l'Assistant de Jet Hybride (`src/engine/dice.ts` + tests) : résolution à partir d'une valeur de dé physique saisie par le joueur ou d'un tirage aléatoire, gestion Avantage/Désavantage et critiques (1 / 20)
- [ ] Validation stricte et migration de schéma (`src/engine/validators.ts` + tests)

## Jalon 2 — Stockage IndexedDB, Undo/Redo Copy-on-Write & Backup JSON
- **Focus d'apprentissage** : Architecture de stockage multi-tiers dans le navigateur (RAM Copy-on-Write avec `Zustand` + `Immer`, persistance asynchrone `IndexedDB`, snapshots immuables et portabilité JSON).
- **Critère de validation** : Les modifications persistent après rechargement, le bouton Undo/Redo annule/rétablit instantanément les actions, les snapshots avant Repos Long sont restaurables, et l'export/import JSON transfère une fiche complète sans perte.
- [ ] Définition du contrat abstrait `CharacterRepository` et implémentation de l'adaptateur `IndexedDB` (stores `characters` et `snapshots`)
- [ ] Création du store `Zustand` + `Immer` avec écriture *Write-Behind* vers `IndexedDB` et pile d'historique **Undo/Redo** en mémoire
- [ ] Service de **Snapshots locaux** (création manuelle nommée + snapshot automatique avant un Repos Long + restauration)
- [ ] Service d'**Export / Import JSON** avec contrôle de validité du schéma à l'import

## Jalon 3 — Interface "Mode Partie (Cockpit)" & Assistant de Jet Hybride
- **Focus d'apprentissage** : Ergonomie tactile Tablette sans friction (zéro édition accidentelle, densité d'information maîtrisée, micro-interactions de combat et de jets).
- **Critère de validation** : En Mode Partie sur format Tablette et Desktop, l'utilisateur peut gérer un combat complet (PV, munitions, sorts, états), effectuer ses jets en mode dé physique ou virtuel, et déclencher un Repos Court/Long avec possibilité d'annuler.
- [ ] Vue **Cockpit de Partie** (grille responsive Tablette/Desktop) : bandeau vital (PV, CA, Initiative, Vitesse, États/Épuisement) et modale rapide de Dégâts / Soins / PV temporaires
- [ ] Panneau des **Caractéristiques, Sauvegardes & Compétences** (avec filtres rapides et mise en évidence des maîtrises/expertises)
- [ ] Panneau central d'**Actions, Armes & Ressources** (coches tactiles rapides pour munitions/charges, emplacements de sorts et capacités de classe)
- [ ] Composant **Assistant de Jet Hybride** (`<dialog>` / popover) : affichage de la formule décomposée, pavé `1-20` pour saisir son dé physique, bouton de jet virtuel et journal des derniers jets
- [ ] Flux interactif de **Repos Court** (dépense de Dés de Vie) et **Repos Long** (avec création automatique d'un snapshot préalable)

## Jalon 4 — Interface "Mode Édition (Forge)", Multi-Personnages & PWA
- **Focus d'apprentissage** : Conception de formulaires complexes ergonomiques, gestion de bibliothèque multi-personnages et mise en cache hors-ligne par Service Worker (PWA).
- **Critère de validation** : L'utilisateur peut créer un personnage de zéro (y compris avec des compétences/armes post-apo sur mesure), le faire monter de niveau, gérer ses snapshots et installer l'application en PWA 100 % hors-ligne.
- [ ] Sélecteur de personnages (*Empty State*, création, duplication, suppression sécurisée, chargement d'un personnage de démonstration, gestionnaire de Snapshots et Export/Import JSON)
- [ ] Vue **Forge d'Édition** : édition de l'identité, des scores de caractéristiques, ajout/personnalisation de compétences (post-apo/homebrew), gestion des ressources suivies
- [ ] Éditeur d'armes/attaques, d'inventaire (poids, équipement équipé) et de grimoire de sorts/capacités
- [ ] Configuration PWA (`vite-plugin-pwa`, manifest, icônes, fonctionnement 100 % hors-ligne)

## Jalon 5 — Hardening, Sécurité & Audit Qualité (Obligatoire)
- **Focus d'apprentissage** : Durcissement applicatif, résilience face aux fichiers corrompus, accessibilité et performance de production.
- **Critère de validation** : Audit de sécurité et qualité validé, score Lighthouse >= 95 (Performance, Accessibilité, Best Practices), zéro vulnérabilité.
- [ ] Revue de sécurité : absence de secrets dans Git, vérification `.gitignore`, configuration d'une Content Security Policy (CSP) stricte dans `index.html`
- [ ] Tests de robustesse sur l'import JSON (fichiers tronqués, types erronés, payloads volumineux ou tentatives d'injection XSS)
- [ ] Audit des dépendances (`npm audit`), vérification du typage strict et nettoyage du code mort
- [ ] Audit d'accessibilité (`a11y-debugging` : contrastes, focus clavier, cibles tactiles >= 44 px) et de performance (`chrome-devtools` / Lighthouse)

---

## Parking Lot / Jalons Futurs (v2)
- **Jalon v2.1 — Synchronisation Homelab (WireGuard + Nginx)** : Implémentation d'un `RemoteHomelabAdapter` branché sur `CharacterRepository` synchronisant `IndexedDB` avec un micro-service REST + SQLite hébergé sur le homelab personnel (accessible en local et à distance via le VPN WireGuard UniFi et le reverse proxy Nginx).
- **Jalon v2.2 — Compendium SRD 5e (2014) & Catalogue Homebrew local** : Intégration d'une bibliothèque locale interrogeant une base SRD 5e et permettant de sauvegarder ses propres modèles d'armes, mutations, sorts et équipements post-apo réutilisables d'un personnage à l'autre.
