# Spécifications Fonctionnelles — Grimoire 5e

## 1. Vision & Périmètre v1
Application web personnelle de **fiche de personnage Donjons & Dragons 5e (édition 2014)** avec prise en charge native d'adaptations **modernes / post-apocalyptiques** (compétences, armes, armures et ressources personnalisables). L'application combine la rigueur mathématique d'un calculateur de règles 5e automatisé et la souplesse d'une saisie libre (*Homebrew-friendly*), conçue pour être utilisée intégralement sur **PC/Laptop** comme sur **Tablette** (à la table de jeu comme hors session).

| Domaine | Exigence |
|---|---|
| **Cœur des Règles D&D 5e (2014)** | Calcul automatique des modificateurs de caractéristiques (`floor((score - 10) / 2)`), du niveau global (somme des niveaux de classes en cas de **multi-classage**), du bonus de maîtrise (`ceil(niveauGlobal / 4) + 1`), des jets de sauvegarde, de l'initiative, de la Perception passive, de la CA, des bonus d'attaque et des DD de sauvegarde des sorts (par classe d'incantation). |
| **Flexibilité Moderne / Post-Apo & Multi-classage** | Gestion native du **multi-classage** (plusieurs classes/archétypes avec leurs propres dés de vie et caractéristiques d'incantation) ; portrait de personnage personnalisable par **upload d'image** (redimensionné et compressé côté client en WebP/JPEG pour être embarqué dans `IndexedDB` et dans l'export `.json`) ; saisie libre des dons et traits ; possibilité d'ajouter ou renommer des compétences personnalisées (ex. *Informatique*, *Pilotage*, *Technologie*, *Survie en zone irradiée*) rattachées à la caractéristique de son choix, avec maîtrise, demi-maîtrise ou expertise. |
| **Gestion de la Survie & Ressources** | Gestion rapide des PV (actuels, maximum, temporaires, dégâts/soins par delta `+` / `-`), réserves multiples de Dés de Vie par taille (`d6`, `d8`, `d10`, `d12`) issues des différentes classes, Jets contre la mort, niveau d'Épuisement (0 à 6) et états/conditions actifs (Empoisonné, À terre, Irradié, etc.). |
| **Mécanique de Repos (Court / Long)** | **Repos Court** : dépense interactive de Dés de Vie au choix parmi les réserves disponibles (`d6` à `d12`), recharge des emplacements de Pacte et des capacités marquées *"Récupération sur repos court"*. **Repos Long** : restauration des PV, de la moitié du total des Dés de Vie (minimum 1, répartie par taille de dé), des emplacements de sorts standards et des ressources de repos long. |
| **Actions, Armes & Sorts / Capacités** | Liste d'attaques et d'actions typées (Action, Action bonus, Réaction) avec gestion des munitions/charges. Gestion des emplacements de sorts (niveaux 1 à 9 + Pacte) et fiches de sorts/capacités technologiques filtrables. |
| **Assistant de Jet Hybride** | Au clic sur un jet (compétence, sauvegarde, attaque, dégâts) : affichage de la formule détaillée (`1d20 + X`) avec **deux modes au choix** : saisie rapide de la valeur du dé physique lancé à la table (calcul immédiat du total et détection critique 1/20) **ou** tirage virtuel instantané, avec historique de session. |
| **Double Mode d'Affichage (Bascule instantanée sur tout appareil)** | Les deux modes sont disponibles à tout moment en 1 clic sur le même appareil (PC/Laptop ou Tablette) en partageant exactement le même état en mémoire : **Mode Partie (Cockpit)** (verrouille la structure pour éviter les fausses manipulations et met en avant les actions de jeu) et **Mode Édition (Forge)** (permet de créer, d'ajuster une statistique à la volée pendant la partie, d'ajouter un butin ou de monter de niveau). |
| **Persistance, Undo/Redo & Snapshots** | Sauvegarde locale automatique dans `IndexedDB`, pile **Undo/Redo** en mémoire pour annuler une erreur de clic, **Snapshots manuels et automatiques** (ex. avant un Repos Long), et **Export/Import JSON** pour synchroniser PC et Tablette. |
| **Langue & Lexique Bilingue (FR / EN)** | Interface de l'application en français (sans bibliothèque i18n lourde), mais **support bilingue FR/EN natif pour les termes D&D 5e** : lexique intégré pour les 6 caractéristiques, les 18 compétences officielles et les conditions (ex. **Escamotage** · *Sleight of Hand*), champ optionnel `originalName` (VO/VF) sur les sorts, capacités, armes et équipements, et recherche/filtrage insensible à la langue et aux accents. |

---

## 2. Hors périmètre v1 (Parking Lot / Jalon ultérieur)
- **Synchronisation réseau automatique Homelab** : prévue en Jalon v1.5 / v2 via un micro-service sur le réseau Homelab (accessible en VPN WireGuard + Reverse Proxy Nginx). La v1 prépare déjà l'architecture (`CharacterRepository` abstrait) et assure le transfert via Export/Import JSON.
- **Compendium encyclopédique intégré & Bibliothèque Homebrew partagée** : prévu en évolution future (connecteur vers API publiques SRD 5e comme `dnd5eapi.co` / `open5e` ou import de catalogues JSON).
- **Table virtuelle (VTT) & Cartographie** : pas de gestion de grille de combat ni de brouillard de guerre.
- **Mode Maître du Jeu multi-joueurs en temps réel** : l'application est centrée sur la gestion des personnages du joueur.

---

## 3. Critères de qualité
- **Performance** : Chargement initial < 1 s en local/PWA, réactivité immédiate (0 ms de latence perçue sur les mutations d'état en RAM), animations à 60 fps.
- **Ergonomie Tactile & Desktop** : Cibles tactiles >= 44x44 px sur Tablette (aucun bouton minuscule pour les PV ou les cases de ressources), zéro scroll horizontal, densité d'information maîtrisée en orientation Paysage comme Portrait.
- **Accessibilité** : Contrastes élevés conformes WCAG AA minimum (indispensable dans une pièce tamisée autour d'une table de jeu), navigation clavier complète sur PC, composants natifs sémantiques (`<dialog>`, `<button>`).
- **Intégrité des Données (RPO = 0 local)** : Validation stricte du schéma à la lecture et à l'import JSON, création automatique d'un snapshot de sécurité avant toute opération destructive (Repos Long, écrasement de fiche).

---

## 4. Parcours Utilisateur & États UI
L'application offre **100 % des fonctionnalités sur tous les supports (Laptop/PC et Tablette)**. Le passage entre le **Mode Partie (Cockpit)** et le **Mode Édition (Forge)** est un simple commutateur d'affichage instantané (*Toggle*) sur la même fiche active :

- **Parcours en Mode Édition (Forge — Création, ajustement en cours de partie ou montée de niveau)** :
  Création d'un personnage (ou modification à la volée pendant une session : ajout d'une arme trouvée, ajustement d'un score, nouvelle compétence post-apo ou nouveau sort). Toute modification met immédiatement à jour l'état partagé.
- **Parcours en Mode Partie (Cockpit — Jeu actif à la table sur Laptop ou Tablette)** :
  Consultation en un coup d'œil des statistiques clés sans risque de supprimer ou dérégler un champ par erreur. Application rapide de dégâts/soins, coche des munitions et emplacements de sorts, utilisation de l'**Assistant de Jet Hybride** (saisie du dé physique ou jet virtuel), déclenchement d'un Repos Court ou Long. Si le joueur doit modifier la structure de sa fiche en pleine partie, il bascule en *Mode Forge* en 1 clic, fait son changement, et revient en *Mode Cockpit*.
- **Parcours optionnel Multi-Appareils (Transfert PC <-> Tablette)** :
  Si le joueur change d'appareil (ex. préparation sur PC fixe puis départ en session avec une Tablette), il utilise l'Export/Import `.json` en 1 clic (en attendant la synchronisation automatique Homelab prévue en v2).
- **États UI couverts systématiquement** :
  - *Empty State* accueillant lorsqu'aucun personnage n'est présent (proposant de créer un personnage neuf, de charger un personnage de démonstration pré-rempli ou d'importer un JSON).
  - Confirmation avec aperçu des changements avant d'appliquer un **Repos Long**.
  - Bannière ou toast discret avec bouton **Annuler (Undo)** après toute modification importante de ressource.
  - Rapport d'erreur explicite en français si un fichier `.json` importé est invalide ou corrompu.

---

## 5. Direction Artistique & Design System
- **Ambiance visuelle** : *"Grimoire Tactique Moderne"* avec **double thème Clair (par défaut) / Sombre** commutable en 1 clic — alliance d'une esthétique éditoriale soignée (bordures finement ciselées, hiérarchie typographique inspirée des ouvrages de jeu de rôle modernes) et d'une lisibilité chirurgicale digne d'un tableau de bord.
- **Palette & Double Thème (`data-theme="light" | "dark"`)** :
  - **Thème Clair (Par défaut — "Ivoire & Encre")** :
    - Fonds : Parchemin ivoire doux sans éblouissement (`--bg-canvas: #f6f3ec`), Surface carte papier vélin (`--bg-surface: #fcfaf5`), Surface secondaire (`--bg-elevated: #ede8dc`).
    - Textes : Encre anthracite profonde très contrastée (`--text-primary: #1a1d24`), Gris ardoise (`--text-secondary: #4a5262`), Muted (`--text-muted: #767f92`).
    - Accents : Bronze doré / Cuivre (`--accent-primary: #9a6b16`), Vert sauge (`--color-hp-ok: #2b8a3e`), Ambre (`--color-hp-warn: #d97706`), Cramoisi sceau (`--color-hp-crit: #c92a2a`), Bleu cobalt (`--color-arcane: #1971c2`).
  - **Thème Sombre ("Obsidienne & Or")** :
    - Fonds : Obsidienne profond (`--bg-canvas: #0d0f12`), Ardoise sombre (`--bg-surface: #151921`), Surface élevée (`--bg-elevated: #1e2430`).
    - Textes : Ivoire clair (`--text-primary: #f0ece1`), Gris pierre (`--text-secondary: #a0aab8`), Muted (`--text-muted: #687385`).
    - Accents : Or ancien (`--accent-primary: #d4a853`), Vert émeraude (`--color-hp-ok: #2ea043`), Orange ambré (`--color-hp-warn: #d29922`), Rouge cramoisi (`--color-hp-crit: #f85149`), Cyan éthéré (`--color-arcane: #58a6ff`).
- **Typographie** :
  - *Titrage & Identité* : Police serif de caractère à forte lisibilité (ex. `Cinzel` ou `Cormorant Garamond` pour les en-têtes de section).
  - *Corps & Interface* : Sans-serif géométrique humaniste ultra-lisible (ex. `Inter` ou `Plus Jakarta Sans`).
  - *Valeurs numériques, Modificateurs & Formules de dés* : Police monospace ou `font-variant-numeric: tabular-nums` obligatoire pour aligner parfaitement les `+7`, `18`, `2d8 + 4`.
- **Design Tokens CSS** : Architecture 100 % pilotée par variables CSS sémantiques dans `src/theme/tokens.css` (aucune couleur hexadécimale en dur dans les composants UI).
