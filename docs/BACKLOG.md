# Backlog - Grimoire 5e

Légende : `[x]` fait, `[ ]` à faire, `✅` jalon terminé, `⏳` jalon en cours.

## Jalon 0 - Fondations, Outillage & Design System ("Grimoire Tactique" Clair / Sombre) ✅
- **Focus d'apprentissage** : Configuration d'une base React 19 + TypeScript ultra-stricte et architecture de Design Tokens CSS bi-thème (Thème Clair *Ivoire & Encre* par défaut + Thème Sombre *Obsidienne & Or*).
- **Critère de validation** : `npm test`, `npm run lint` et `npm run build` passent sans erreur ; la coquille applicative (App Shell) affiche la typographie, la bascule de thème Clair/Sombre et le sélecteur de mode (*Cockpit* / *Forge*) sur Desktop et Tablette.
- [x] Initialisation du projet Vite + React 19 + TypeScript (`strict`, `noUncheckedIndexedAccess`), ESLint et Vitest
- [x] Création du système de Design Tokens CSS bi-thème (`src/theme/tokens.css`, `base.css`) : Thème Clair par défaut + Thème Sombre, typographie tabulaire pour les chiffres, cibles tactiles >= 44 px
- [x] Mise en place de l'App Shell responsive (en-tête d'identité du personnage avec cadre du portrait, barre d'état rapide, bascule Mode Partie / Mode Édition et commutateur de thème Clair / Sombre)
- [x] Configuration PWA (`vite-plugin-pwa`, manifest, icône SVG, Service Worker hors-ligne), exposition réseau local (`--host`) et workflow GitHub Actions pour déploiement GitHub Pages

## Jalon 1 - Moteur de Règles D&D 5e Pur & Adaptations Post-Apo (TDD) ✅
- **Focus d'apprentissage** : Séparation stricte entre données sources stockées et données dérivées calculées à la volée ; développement piloté par les tests (TDD) en TypeScript pur.
- **Critère de validation** : 100 % des tests unitaires de `src/engine/` passent avec `npm test` (modificateurs, maîtrise, compétences personnalisées, CA, DD, repos court/long, assistant de jets).
- [x] Définition des types du domaine versionnés (`src/engine/types.ts`), du lexique bilingue FR/EN (`src/engine/glossary.ts` : 6 caractéristiques, 18 compétences 5e, conditions, recherche bilingue) et d'un personnage de référence complet (fixture de test / démo)
- [x] Implémentation des calculateurs purs (`src/engine/calculators.ts` + tests) : niveau global multi-classes, modificateurs, bonus de maîtrise, sauvegardes, compétences (standard 5e + compétences personnalisées post-apo), CA, initiative, Perception passive, DD de sorts par classe
- [x] Implémentation de la machine à états des ressources et repos (`src/engine/rest.ts` + tests) : dégâts/soins avec absorption par PV temporaires, jets contre la mort, Repos Court (dépense par pool de Dés de Vie `d6`/`d8`/`d10`/`d12` et emplacements de Pacte) et Repos Long
- [x] Implémentation du moteur de l'Assistant de Jet Hybride (`src/engine/dice.ts` + tests) : résolution à partir d'une valeur de dé physique saisie par le joueur ou d'un tirage aléatoire, gestion Avantage/Désavantage et critiques (1 / 20)
- [x] Validation stricte et migration de schéma (`src/engine/validators.ts` + tests)

## Jalon 2 - Stockage IndexedDB, Undo/Redo Copy-on-Write & Backup JSON ✅
- **Focus d'apprentissage** : Architecture de stockage multi-tiers dans le navigateur (RAM Copy-on-Write avec `Zustand` + `Immer`, persistance asynchrone `IndexedDB`, snapshots immuables et portabilité JSON).
- **Critère de validation** : Les modifications persistent après rechargement, le bouton Undo/Redo annule/rétablit instantanément les actions, les snapshots avant Repos Long sont restaurables, et l'export/import JSON transfère une fiche complète sans perte.
- [x] Définition du contrat abstrait `CharacterRepository` et implémentation de l'adaptateur `IndexedDB` (stores `characters` et `snapshots`)
- [x] Création du store `Zustand` + `Immer` avec écriture *Write-Behind* vers `IndexedDB` et pile d'historique **Undo/Redo** en mémoire
- [x] Service de **Snapshots locaux** (création manuelle nommée + snapshot automatique avant un Repos Long + restauration)
- [x] Service d'**Export / Import JSON** avec contrôle de validité du schéma à l'import

## Jalon 3 - Interface "Mode Partie (Cockpit)" & Assistant de Jet Hybride ✅
- **Focus d'apprentissage** : Ergonomie tactile Tablette sans friction (zéro édition accidentelle, densité d'information maîtrisée en 2 larges colonnes, micro-interactions de combat et de jets).
- **Critère de validation** : En Mode Partie sur format Tablette et Desktop, l'utilisateur peut gérer un combat complet (PV, munitions, sorts, états, notes de butin), effectuer tous ses jets (`d4` à `d100`) en mode dé physique ou virtuel via la fenêtre flottante déplaçable, et déclencher un Repos Court/Long avec possibilité d'annuler.
- [x] Vue **Cockpit de Partie** (grille responsive 2 colonnes Tablette/Desktop + modale `Système` séparée derrière l'icône Engrenage) : bandeau vital (PV, CA, Initiative, Vitesse, États/Épuisement) et modale rapide de Dégâts / Soins / PV temporaires
- [x] Panneau des **Caractéristiques, Sauvegardes & Compétences** (cartes épurées sans débordement, card pleine largeur *Bonus de Maîtrise / Proficiency Bonus*, filtres rapides et recherche bilingue)
- [x] Panneau central d'**Actions, Armes, Sorts & Équipement/Notes** (boutons `+`/`−` en relief, emplacements de sorts et prise de notes/butin rapide en partie)
- [x] Composant **Assistant de Jet Hybride Universel** (`<dialog>` flottant non-modal déplaçable sans flou d'arrière-plan + bouton flottant permanent FAB) : pavé physique dynamique adapté au dé (`d4`, `d6`, `d8`, `d10`, `d12`, `d20`, `d100`), jets de dégâts normaux/critiques, mode **Jet Libre** et journal des derniers jets
- [x] Flux interactif de **Repos Court** (dépense de Dés de Vie) et **Repos Long** (avec création automatique d'un snapshot préalable)

## Jalon 4 - Interface "Mode Édition (Forge)", Multi-Personnages & PWA ✅
- **Focus d'apprentissage** : Conception de formulaires complexes ergonomiques, gestion de bibliothèque multi-personnages et mise en cache hors-ligne par Service Worker (PWA).
- **Critère de validation** : L'utilisateur peut créer un personnage de zéro (y compris avec des compétences/armes post-apo sur mesure), le faire monter de niveau, gérer ses snapshots et installer l'application en PWA 100 % hors-ligne.
- [x] Sélecteur de personnages (*Empty State*, création, duplication, suppression sécurisée, chargement d'un personnage de démonstration, gestionnaire de Snapshots et Export/Import JSON)
- [x] Vue **Forge d'Édition** : édition de l'identité (avec **upload et compression automatique du portrait du personnage**), des langues maîtrisées, des scores de caractéristiques, ajout/personnalisation de compétences (post-apo/homebrew) et maîtrises d'outils (avec jets de réussite en Cockpit et Forge), gestion des ressources suivies
- [x] Éditeur d'armes/attaques, d'inventaire (poids, équipement équipé) et de grimoire de sorts/capacités
- [x] Structuration du **Butin (Loot), de la Monnaie/Crédits et du Carnet de Notes** dans le modèle de données (ajout rapide d'objets trouvés en partie dans `inventory`, bourse/crédits et entrées de notes catégorisées persistées dans `IndexedDB` et les Snapshots)

## Correctifs UX, Tablette & Règles en attente
- [x] **Historique des jets** : augmenter la limite de rétention dans l'Assistant de Jet de `12` à `100` entrées.
- [ ] **Assistant de Jet sur Tablette (Paysage)** : corriger le débordement du bouton `Passer aux Dégâts` hors de la modale et compacter la hauteur de la fenêtre flottante pour qu'elle tienne confortablement en format paysage.
- [x] **Visibilité du résultat (Assistant de Jet)** : améliorer la lisibilité et le contraste du bandeau de résultat fixe en haut de la modale.
- [x] **Épuration de la modale Système** : supprimer le jargon technique interne (`IndexedDB`, `Tier 1`, `Tier 2`, etc.), retirer la première ligne de séparation inutile tout en haut, enlever la numérotation des titres, agrandir les titres et ajouter plus de marge entre les sections.
- [ ] **Règles d'États & d'Épuisement (D&D 5e)** : implémenter les effets mécaniques automatiques selon les règles 5e (désavantage sur les jets de caractéristiques/attaques/sauvegardes concernés, vitesse divisée par 2 dès l'épuisement niveau 2 puis 0 au niveau 5, PV max divisés par 2 au niveau 4, impacts d'états comme *Empoisonné*, *Effrayé*, *À terre*, etc.).
- [x] **Vitesse de déplacement et sens spéciaux selon la langue (mètres / ft)** : adapter la saisie et l'affichage de la vitesse ainsi que la traduction/portée des sens spéciaux selon le mode de langue (`fr` en mètres, `en` en pieds/`ft`, et en mode `bilingual` saisie en mètres avec affichage automatique de l'équivalent en `ft`).
- [x] **Import / Export JSON dans la modale Personnages** : déplacer l'import et l'export de fichiers `.json` depuis la modale `Système` vers la modale `Personnages` (plus logique pour la gestion de bibliothèque multi-personnages).
- [x] **Capacités type "sort" à récupération sur Repos Court / Long** : améliorer la gestion des capacités spéciales qui fonctionnent quasi comme des sorts (jets d'attaque ou DD de sauvegarde, dégâts/soins), mais avec un compteur d'utilisations liées à un repos court ou long (ex. *Souffle draconique*, *Conduit divin*, capacités de sous-classe).

## Jalon 5 - Hardening, Sécurité & Audit Qualité (Obligatoire)
- **Focus d'apprentissage** : Durcissement applicatif, résilience face aux fichiers corrompus, accessibilité et performance de production.
- **Critère de validation** : Audit de sécurité et qualité validé, score Lighthouse >= 95 (Performance, Accessibilité, Best Practices), zéro vulnérabilité.
- [ ] Revue de sécurité : absence de secrets dans Git, vérification `.gitignore`, configuration d'une Content Security Policy (CSP) stricte dans `index.html`
- [ ] Tests de robustesse sur l'import JSON (fichiers tronqués, types erronés, payloads volumineux ou tentatives d'injection XSS)
- [ ] Audit des dépendances (`npm audit`), vérification du typage strict et nettoyage du code mort
- [ ] Audit d'accessibilité (`a11y-debugging` : contrastes, focus clavier, cibles tactiles >= 44 px) et de performance (`chrome-devtools` / Lighthouse)

---

## Parking Lot / Jalons Futurs (v2)
- **Agrandissement du portrait en modale (`512 x 512 px`)** : En cliquant sur la miniature du portrait (en Cockpit comme en Forge), ouvrir une modale `<dialog>` centrée affichant le portrait en taille native jusqu'à `512 x 512 px` (les portraits importés sont déjà sauvegardés au format max `512 x 512 px` dans `portrait-utils.ts`).
- **Fiabilisation du déploiement GitHub Pages (`.github/workflows/deploy.yml`)** : Séparer le workflow en deux jobs distincts (`build` puis `deploy` avec `needs: build`) pour éviter les erreurs de latence d'indexation d'artefact (`Found 0 artifact(s)`) et la duplication d'artefacts lors d'une relance (`Multiple artifacts named "github-pages"`), et mettre à jour les actions vers des versions Node 24 natives.
- **Jalon v2.1 - Synchronisation Homelab (WireGuard + Nginx)** : Implémentation d'un `RemoteHomelabAdapter` branché sur `CharacterRepository` synchronisant `IndexedDB` avec un micro-service REST + SQLite hébergé sur le homelab personnel (accessible en local et à distance via le VPN WireGuard UniFi et le reverse proxy Nginx).
- **Jalon v2.2 - Compendium SRD 5e (2014) & Catalogue Homebrew local** : Intégration d'une bibliothèque locale interrogeant une base SRD 5e et permettant de sauvegarder ses propres modèles d'armes, mutations, sorts et équipements post-apo réutilisables d'un personnage à l'autre.
- **Jalon v2.3 - Gestion de l'XP (Points d'Expérience / Jalons) & Assistant de Montée de Niveau (Level-Up Wizard)** : Suivi de la jauge d'XP (avec table officielle des seuils de niveaux 1 à 20 D&D 5e ou mode *Progression par Jalons / Milestone*), et assistant interactif étape par étape lors du passage de niveau (choix de la classe à incrémenter ou multi-classage, tirage ou moyenne du nouveau Dé de Vie + mod. CON, évolution automatique du bonus de maîtrise, paliers d'Augmentation de Caractéristiques / Don aux niveaux 4/8/12/16/19, nouveaux emplacements de sorts et création automatique d'un Snapshot *Avant passage au Niveau N*).
