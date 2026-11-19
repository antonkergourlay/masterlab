# Master Lab

Explorer les **Masters publics de la discipline « Lettres, sciences du langage, arts »** (dont le numérique, la création et l'audiovisuel) : formations, candidatures Mon Master, insertion professionnelle de leur discipline. Projet de la SAÉ 3.01/3.03 (BUT MMI Laval), construit à partir du zoning, des wireframes et du prototype de l'équipe.

Tout ce qui est affiché vient de données ouvertes officielles (MESRI-SIES, Licence Ouverte). Une valeur absente s'affiche « n.d. » : rien n'est inventé.

## Lancer le site
Ouvrir `index.html` dans le navigateur (double-clic), ou :
```bash
npm start
```
puis <http://localhost:5500>. Aucune installation n'est nécessaire (Leaflet est dans `vendor/`, les données dans `js/data.js`).

## Pages
| Page | Rôle |
|---|---|
| `index.html` | recherche, carte, chiffres clés |
| `carte.html` | carte Leaflet : bulles regroupées qui se divisent au zoom, panneau de détail |
| `formations.html` | liste filtrable (mots-clés, zone, mention, alternance, taux d'accès) et triable |
| `fiche.html?id=…` | admission, 3 sessions, origine des admis, position nationale, insertion de la discipline |
| `comparateur.html` | jusqu'à 3 formations côte à côte |
| `quiz.html` | 5 questions, résultat en « X critères sur Y » |

## Données
Générées par `scripts/build-data.mjs` à partir des CSV officiels et de deux API publiques :
```bash
node scripts/build-data.mjs "<dossier des CSV>"
node scripts/check-data.mjs
```
Détail des sources, définitions et limites : [ADMIN.md](ADMIN.md).

## Équipe
Loïs Hesnault, Anton Kergourlay, Ezechiel Fouiden Oster, William Beslon, Nathan Vacher.
