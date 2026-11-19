# Master Lab : notes pour continuer le développement

Site statique multi-pages (HTML + scripts classiques, Leaflet, pas de build) qui reprend le prototype de l'équipe (`Wireframe/3-prototype`). Voir [ADMIN.md](ADMIN.md) pour l'architecture et [README.md](README.md) pour le lancement.

## Règles du projet
- **Ne pas changer le parcours ni les pages du prototype** sans accord de l'équipe : mêmes libellés, même style (`css/style.css`).
- **Aucune notion de compte** : pas de connexion, inscription, favoris, alertes ni espace personnel (pas de base de données). Ne pas en réintroduire.
- **Ne jamais inventer de donnée.** Absent = `null` dans `js/data.js`, « n.d. » à l'écran. Jamais 0.
- **Définir avant d'afficher.** Le « taux d'accès » est propositions ÷ candidats (phase principale), pas un taux officiel : toujours avec l'infobulle `help(DEF.taux)`.
- **Candidats comptés par formation** : ne pas les additionner entre formations sans dire « candidatures ».
- **Insertion = établissement × discipline, promotions ≤ 2020.** Ne jamais l'attribuer à une formation précise sans le dire.
- **2023 ≠ 2024-2025** (phases d'admission, colonnes) : le signaler sur toute comparaison multi-sessions.
- Pas de loyers, frais, échéances, programmes ou métiers : pas dans les données ouvertes.
- Pas de `fetch` ni de modules ES : les pages doivent marcher en `file://`. Les données sont dans `js/data.js` (généré, ne pas éditer à la main).
- Charte vF (dossier `Charte graphique/`) : bleu #0011E0, Cool sky #5DA9E9, blanc, noir. Titres H1 Blauer Nue Heavy (remplacé par Archivo, Google Fonts, tant que la police n'est pas fournie), H2 Inter Bold, H3 Outfit Medium. Logo : `assets/logo.svg`.
- Info-bulles « ? » : toujours `help(texte)` (bouton, se ferme au clic ailleurs). Pas de `<details>`.
- Recherche tolérante (`filterMasters`, `matches` dans `js/app.js`) : accents, pluriels, tirets, une faute de frappe.

## Commandes
- `npm start` : serveur local sur le port 5500 (facultatif)
- `node scripts/build-data.mjs "<dossier CSV>"` puis `node scripts/check-data.mjs`

## Pièges connus
- Les libellés de mention contiennent des virgules : ne pas les découper avec `split(',')`.
- La ville et les coordonnées de l'API Masters-stats sont fausses pour plusieurs formations : on géocode le lieu de formation (voir ADMIN.md).
- `L` (Leaflet) est un global (script classique), pas un import. Pas de clé API : fond OpenStreetMap ; ne pas passer à Google Maps sans clé.
- L'outre-mer n'est pas placé sur la carte.
