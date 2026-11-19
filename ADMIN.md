# Documentation Administrateur

## 1. Objectif
Passation à une équipe de développement et de tierce maintenance applicative (TMA) de l'application web « Master Lab » : aider les étudiants de bac+3 à découvrir les Masters publics en création numérique, leurs chiffres de candidature (Mon Master) et l'insertion professionnelle de leur discipline.

Le site reprend le prototype validé en SAÉ (zoning, wireframes, prototype) : mêmes écrans, même charte, même parcours. Seules les données sont réelles. **Pas de compte** (connexion, inscription, favoris, alertes, espace personnel) : le site n'a pas de base de données.

## 2. Présentation technique
- **Front-end** : HTML5, CSS3, JavaScript sans framework ni étape de build. Site statique : aucune base de données, aucun serveur applicatif.
- **Scripts classiques** (pas de modules ES) et **données embarquées** dans `js/data.js` : le site fonctionne aussi bien en double-cliquant sur `index.html` (`file://`) que sur un serveur HTTP.
- **Visualisation** : ECharts 5.5.1, fourni dans `vendor/echarts.min.js` (aucun CDN pour les scripts). La carte de France utilise `geo` + `registerMap` avec les régions (`js/france-regions.js`, issu de `assets/geo/franceRegions.json`) et les encarts d'outre-mer (`specialAreas`), comme la démonstration du cours. Les autres graphiques de la fiche (entonnoir, anneau, colonnes, répartition, nuage de points) sont en HTML/CSS.
- **Polices** : League Spartan et Open Sans (Google Fonts). Sans connexion, les polices système prennent le relais.
- **Mémoire locale** : seule la sélection du comparateur est gardée dans le navigateur (`localStorage`, clé `ml_cmp`). Aucune donnée personnelle.

### Arborescence
```
index.html            accueil : recherche, carte, chiffres
carte.html            carte interactive (bulles par ville, zoom, pastilles, panneau)
formations.html       liste filtrable et triable
fiche.html?id=<ifc>   fiche formation : admission, position, insertion
comparateur.html      3 formations côte à côte
quiz.html             quiz de profil (critères vérifiables)
css/style.css         feuille de style du prototype + ajouts (aide, notes, carte ECharts)
js/app.js             socle commun : données, indicateurs, en-tête/pied, comparateur, cartes
js/map.js             carte ECharts (régions, bulles, pastilles)
js/data.js            données générées (window.MASTERLAB)
js/france-regions.js  fond de carte généré (window.FRANCE_GEO)
scripts/              build-data.mjs, check-data.mjs, build-topo.mjs (fond topographique, non utilisé)
assets/               favicon, GeoJSON des régions
vendor/               echarts.min.js
```

## 3. Données
| Source | Fichier / URL | Usage |
|---|---|---|
| Mon Master 2023 | `fr-esr-mon_master_2023.csv` (data.gouv.fr) | candidatures 2023 |
| Mon Master 2024-2025 | `fr-esr-mon_master_2024-2025.csv` (data.gouv.fr) | candidatures 2024 et 2025 |
| Insertion professionnelle | `fr-esr-insertion_professionnelle-master_2010-2020.csv` | insertion 18 et 30 mois |
| API Masters-stats | `https://la-lab4ce.univ-lemans.fr/masters-stats/api/rest` | secteur disciplinaire → discipline d'insertion |
| API Découpage administratif | `https://geo.api.gouv.fr/communes` | coordonnées des villes de formation |

**Régénérer les données** (une fois par nouvelle campagne) :
```
node scripts/build-data.mjs "<dossier contenant les CSV>"
node scripts/check-data.mjs
```
Le dossier doit contenir `Données des candidatures-20261118/fr-esr-mon_master_2023.csv`, `Données des candidatures-20261118/fr-esr-mon_master_2024-2025.csv` et `fr-esr-insertion_professionnelle-master_2010-2020.csv`. Le script interroge deux API (accès internet requis, quelques minutes) ; Node 18+ suffit (testé avec Node 24). Il écrit `js/data.js` et `js/france-regions.js`.

### Position des formations
Les villes et coordonnées de l'API Masters-stats se sont révélées incohérentes pour plusieurs formations (par exemple une formation lyonnaise placée à « Ampus »). Le script lit donc le premier lieu de formation déclaré sur Mon Master (« … - VILLE (département) ») et le géocode avec geo.api.gouv.fr. Une formation dont le lieu n'est pas lisible reste sans position : elle est listée sous la carte, jamais placée au hasard. L'outre-mer n'est pas placé sur la carte non plus.

### Limites à connaître
- Les candidats sont comptés **par formation** ; ne jamais additionner des candidats de formations différentes sans dire « candidatures ».
- 2023 : une seule phase d'admission, pas de BUT séparé. 2024-2025 : phases principale et complémentaire. Les comparaisons entre sessions utilisent la phase principale et l'indiquent.
- Le **taux d'accès** affiché par le prototype est calculé par le site : propositions ÷ candidats de la phase principale. Ce n'est pas un taux officiel ni une probabilité d'admission. Une infobulle « ? » le rappelle partout. Pour l'alternance, les propositions dépendent des contrats d'apprentissage : taux naturellement bas.
- L'**insertion** est publiée par établissement × discipline (jamais par formation), pour des promotions jusqu'en 2020. Les valeurs « ns » sont stockées en `null` et affichées « n.d. », jamais à zéro. Chaque affichage précise « discipline de l'établissement » et l'année de promotion.
- Non disponibles dans les données ouvertes, donc **absents du site** : programme détaillé, métiers visés, loyers et coût de la vie, frais, échéances Mon Master. Comptes, favoris et alertes sont abandonnés (pas de base de données). Le prototype affichait des valeurs d'exemple pour ces éléments ; elles ont été retirées.
- Le périmètre ne contient aucune formation en Pays de la Loire : aucune mention retenue n'y est ouverte à la candidature dans les fichiers sources.

### Écarts avec le prototype
| Prototype | Site actuel | Pourquoi |
|---|---|---|
| Champ « Métier visé » | Champ « Mention » | aucune donnée ne relie une formation à des métiers |
| « Taux d'accès » | idem + définition en infobulle | l'indicateur est calculé, pas officiel |
| Quiz avec pourcentage de compatibilité | « X critères sur Y » et lesquels | un pourcentage serait inventé |
| Loyer, budget, frais, échéances | retirés | non disponibles |
| Connexion, inscription, favoris, alertes, Mon espace | retirés | pas de base de données |
| Insertion « par formation » | discipline × établissement, ≤ 2020 | granularité réelle de la source |

## 4. Déploiement
1. Cloner le dépôt : `git clone https://github.com/antonkergourlay/masterlab.git`
2. Ouvrir `index.html` dans le navigateur, **ou** lancer un serveur : `npm start` (équivaut à `npx http-server -c-1 -p 5500 .`) puis ouvrir `http://localhost:5500`. L'extension *Live Server* de VSCode convient aussi.
3. Production : copier le dépôt (sans `node_modules/` ni `scripts/`) sur un hébergement statique. Aucun `npm install` n'est nécessaire ; il ne sert qu'à mettre à jour ECharts (`vendor/echarts.min.js` provient de `node_modules/echarts/dist/`).

## 5. Configuration
- **Périmètre « création numérique »** : constante `SCOPE` de `scripts/build-data.mjs` (mentions nationales, « coeur » ou « voisin ») et `MENTIONS` de `js/app.js` (libellés affichés). Il n'existe pas de secteur disciplinaire unique : le périmètre est une liste de mentions. Cœur : Création numérique ; Arts, technologies, création ; Audiovisuel, médias interactifs numériques, jeux ; Humanités numériques. Voisines (case « Inclure les mentions voisines » de la liste) : Design ; Cinéma et audiovisuel.
- **Disciplines d'insertion** : `INS_DISC` de `js/app.js` (disc06 Lettres-langues-arts, disc10 Information-communication, disc16 Informatique), déduites des secteurs du périmètre via `insDiscId` de l'API.
- **Session de référence** : `LAST` dans `js/app.js` (2025).

## 6. Conception (composants)
- **`js/app.js`** : données et indicateurs (`S`, `taux`, `insVal`), recherche (`filterMasters`), mise en forme (`fmt`, `pc`, `eur`, absent → « n.d. »), en-tête et pied de page injectés, comparateur (3 au plus), composant carte de formation (`card`), regroupement par ville (`byCity`).
- **`js/map.js`** : `createMap(el, onClick)` renvoie `{ update({ villes, city, sel }) }`. L'état de la carte est dans l'adresse (`#Ville/<ifc>`) : au retour d'une fiche, le zoom est retrouvé.
- **Pages** : chaque HTML charge `vendor/echarts.min.js` (si carte), `js/data.js`, `js/app.js`, puis un script en ligne.
- **Accessibilité** : lien d'évitement, focus visible, `aria-live` sur le panneau de la carte, liste de villes alternative à la carte, tableaux pour l'insertion, aide « ? » au clavier (`<details>`).

## 7. Roadmap
- **Sprint 2 (09/11 - 20/11)** : prototype v1 fonctionnel sur données réelles, documentation administrateur v1, spécification des visualisations v1.
- **Sprint 3 (07/12 - 18/12)** : version 2 (tests utilisateurs, affinage des visualisations, retours).
- **Sprint 4 (11/01 - 15/01)** : version finale et archive du code sur Umtice. Soutenances la semaine du 18/01.
- Pistes : graphiques ECharts sur la fiche (évolution, insertion), élargir le périmètre.

## 8. Suivi des bugs
- **Statut actuel** : aucun bug bloquant connu à la date de cette version. Contrôle des données : `node scripts/check-data.mjs`.
- Non vérifié : lecteurs d'écran, Firefox et Safari, téléphone réel.
- Les bugs sont suivis dans les *issues* du dépôt GitHub.
