/**
 * build-data.mjs : prépare les données de Master Lab à partir des sources officielles.
 *
 * Usage : node scripts/build-data.mjs <dossier-sources>
 *   <dossier-sources> contient :
 *     Données des candidatures-20261118/fr-esr-mon_master_2023.csv
 *     Données des candidatures-20261118/fr-esr-mon_master_2024-2025.csv
 *     fr-esr-insertion_professionnelle-master_2010-2020.csv
 *
 * Sorties :
 *   js/data.js            window.MASTERLAB = { meta, masters, insertion, reperes }
 *     masters    formations de la discipline « Lettres, sciences du langage, arts » + candidatures 2023-2025 + coordonnées (API REST)
 *     insertion  insertion professionnelle (2010-2020) des disciplines liées au périmètre
 *     reperes    distribution nationale (quantiles) pour situer une formation
 *     meta       sources, périmètre, date de génération, comptages de contrôle
 *   js/france-regions.js  window.FRANCE_GEO (fond de carte)
 *
 * Aucune donnée n'est inventée : valeur absente ou non numérique => null.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.argv[2];
if (!SRC) { console.error('Usage : node scripts/build-data.mjs <dossier-sources>'); process.exit(1); }
const API = 'https://la-lab4ce.univ-lemans.fr/masters-stats/api/rest';

// Périmètre : la discipline officielle « Lettres, sciences du langage, arts » (nomenclature BCN, colonne Discipline des fichiers Mon Master).
// Toutes ses mentions sont gardées ; elles sont rangées en groupes pour que l'utilisateur puisse filtrer (aucun filtre par défaut).
const DISCIPLINE = 'LETTRES, SCIENCES DU LANGAGE, ARTS';
const GROUPES = {
  numerique: { label: 'Numérique, création et audiovisuel', mentions: { 'CREATION NUMERIQUE': 'Création numérique', 'ARTS, TECHNOLOGIES, CREATION': 'Arts, technologies, création', 'CINEMA ET AUDIOVISUEL': 'Cinéma et audiovisuel', 'DESIGN': 'Design' } },
  arts: { label: 'Arts visuels et création artistique', mentions: { 'ARTS': 'Arts', 'ARTS PLASTIQUES': 'Arts plastiques', 'CREATION ARTISTIQUE': 'Création artistique', "APPROCHE CREATIVE DE L'ESPACE PUBLIC": "Approche créative de l'espace public", 'MODE': 'Mode' } },
  spectacle: { label: 'Spectacle vivant et musique', mentions: { 'ARTS DE LA SCENE ET DU SPECTACLE VIVANT': 'Arts de la scène et du spectacle vivant', 'THEATRE': 'Théâtre', 'DANSE': 'Danse', 'MUSICOLOGIE': 'Musicologie' } },
  lettres: { label: 'Lettres, langage et langues', mentions: { 'LETTRES': 'Lettres', 'LETTRES ET CREATION LITTERAIRE': 'Lettres et création littéraire', 'LITTERATURE GENERALE ET COMPAREE': 'Littérature générale et comparée', 'ARTS, LETTRES ET CIVILISATIONS': 'Arts, lettres et civilisations', 'SCIENCES DU LANGAGE': 'Sciences du langage', 'FRANCAIS LANGUE ETRANGERE': 'Français langue étrangère', 'TRAITEMENT AUTOMATIQUE DES LANGUES': 'Traitement automatique des langues' } },
  patrimoine: { label: 'Patrimoine et industries culturelles', mentions: { 'CONSERVATION-RESTAURATION DES BIENS CULTURELS': 'Conservation-restauration des biens culturels', 'INDUSTRIES CULTURELLES': 'Industries culturelles' } },
};
const MENTION_GROUPE = {}, MENTION_LABEL = {};
for (const [g, { mentions }] of Object.entries(GROUPES)) for (const [k, l] of Object.entries(mentions)) { MENTION_GROUPE[k] = g; MENTION_LABEL[k] = l; }

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

/** Parseur CSV (séparateur ;, guillemets, retours ligne dans les champs). */
function parseCsv(text) {
  const rows = []; let row = [], f = '', q = false;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
    } else if (c === '"') q = true;
    else if (c === ';') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f.replace(/\r$/, '')); rows.push(row); }
  const head = rows.shift().map((h) => h.trim());
  return rows.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const load = (p) => parseCsv(readFileSync(join(SRC, p), 'utf8'));
/** Nombre ou null. Les valeurs vides, "ns", "nd"... deviennent null (jamais 0). */
const num = (v) => {
  if (v == null) return null;
  const s = String(v).trim().replace(',', '.');
  return s !== '' && /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
};
/** Lit une colonne dont l'intitulé peut contenir des espaces multiples (comparaison sans espaces en trop). */
const flat = (s) => s.replace(/\s+/g, ' ').trim();
let flatKeys; // table intitulé normalisé -> intitulé réel (seul le fichier 2024-2025 utilise numK)
const numK = (row, label) => {
  flatKeys ??= new Map(Object.keys(row).map((k) => [flat(k), k]));
  const k = flatKeys.get(flat(label));
  if (k === undefined) throw new Error(`Colonne introuvable : ${label}`);
  return num(row[k]);
};
const pct = (a, b) => (a != null && b ? Math.round((a / b) * 1000) / 10 : null);

// ---------- Candidatures ----------
const c23 = load('Données des candidatures-20261118/fr-esr-mon_master_2023.csv');
const c2425 = load('Données des candidatures-20261118/fr-esr-mon_master_2024-2025.csv');

const K = {
  place: 'Capacité offerte limitée par la formation',
  canPP: 'Effectif de candidats ayant confirmé une candidature en phase principale',
  canPC: 'Effectif de candidats ayant confirmé une candidature en phase complémentaire',
  clas: 'Effectif de candidats classés sur une candidature formulée en phase principale ou en phase complémentaire',
  propPP: 'Effectif de candidats ayant reçu une proposition pour une candidature formulée en phase principale',
  prop: 'Effectif de candidats ayant reçu une proposition pour une candidature formulée en phase principale ou en phase complémentaire',
  acc: "Effectif de candidats ayant accepté une proposition d'admission pour une candidature formulée en phase principale ou en phase complémentaire",
  accPP: "Effectif de candidats ayant accepté une proposition d'admission pour une candidature formulée en phase principale",
  canBUT: 'Effectif de candidats en phase principale inscrits en troisième année de bachelor universitaire de technologie à la rentrée N-1',
  propBUT: 'Effectif de candidats ayant reçu une proposition pour une candidature de PP ou de PC inscrits en troisième année de bachelor universitaire de technologie  à la rentrée N-1',
  accBUT: "Effectif de candidats ayant accepté une proposition d'admission pour une candidature de PP ou de PC inscrits en troisième année de bachelor universitaire de technologie  à la rentrée N-1",
  canLG: 'Effectif de candidats en phase principale inscrits en troisième année de licence générale à la rentrée N-1',
  canLP: 'Effectif de candidats en phase principale inscrits en licence professionnelle à la rentrée N-1',
  canMA: 'Effectif de candidats en phase principale inscrits en master à la rentrée N-1',
  canAU: 'Effectif de candidats en phase principale inscrits dans une autre formation à la rentrée N-1',
  canNI: "Effectif de candidats en phase principale qui n'étaient pas inscrits dans un établissement d'enseignement supérieur en France à la rentrée N-1",
  femPP: 'Effectif de candidats ayant confirmé une candidature en phase principale - Dont effectif de femmes',
  rang: 'Rang du dernier appelé en phase principale',
};

/** Ligne 2024-2025 -> indicateurs normalisés (phase principale = référence comparable à 2023). */
function from2425(r) {
  return {
    places: num(r[K.place]),
    candidatsPP: num(r[K.canPP]), candidatsPC: num(r[K.canPC]),
    classes: num(r[K.clas]),
    propositionsPP: num(r[K.propPP]), propositions: num(r[K.prop]),
    acceptesPP: num(r[K.accPP]), acceptes: num(r[K.acc]),
    candidatsBUT: num(r[K.canBUT]), propositionsBUT: num(r[K.propBUT]), acceptesBUT: num(r[K.accBUT]),
    origines: { lg3: num(r[K.canLG]), lp3: num(r[K.canLP]), master: num(r[K.canMA]), autre: num(r[K.canAU]), nonInscrit: num(r[K.canNI]) },
    // Admis (PP ou PC) selon la formation d'origine. Les intitulés de colonnes ont des espaces doubles : on compare sans les espaces en trop.
    admisOrigines: {
      lg3: numK(r, "Effectif de candidats ayant accepté une proposition d'admission pour une candidature de PP ou de PC inscrits en troisième année de licence générale à la rentrée N-1"),
      lp3: numK(r, "Effectif de candidats ayant accepté une proposition d'admission pour une candidature de PP ou de PC inscrits en licence professionnelle à la rentrée N-1"),
      but: numK(r, "Effectif de candidats ayant accepté une proposition d'admission pour une candidature de PP ou de PC inscrits en troisième année de bachelor universitaire de technologie à la rentrée N-1"),
      master: numK(r, "Effectif de candidats ayant accepté une proposition d'admission pour une candidature de PP ou de PC inscrits en master à la rentrée N-1"),
      autre: numK(r, "Effectif de candidats ayant accepté une proposition d'admission pour une candidature de PP ou de PC inscrits dans une autre formation à la rentrée N-1"),
      nonInscrit: numK(r, "Effectif de candidats ayant accepté une proposition d'admission pour une candidature de PP ou de PC qui n'étaient pas inscrits dans un établissement d'enseignement supérieur en France à la rentrée N-1"),
    },
    femmesPP: num(r[K.femPP]), rangDernierPP: num(r[K.rang]),
  };
}
/** Ligne 2023 (une seule phase d'admission) -> mêmes indicateurs. Pas de BUT séparé en 2023 : null. */
function from2023(r) {
  return {
    places: num(r.col),
    candidatsPP: num(r.n_can), candidatsPC: null,
    classes: num(r.n_clas),
    propositionsPP: num(r.n_prop), propositions: num(r.n_prop),
    acceptesPP: num(r.n_accept), acceptes: num(r.n_accept),
    candidatsBUT: null, propositionsBUT: null, acceptesBUT: null,
    origines: { lg3: num(r.n_can_lg3), lp3: num(r.n_can_lp3), master: num(r.n_can_master), autre: num(r.n_can_autre), nonInscrit: num(r.n_can_noninscri) },
    admisOrigines: { lg3: num(r.n_accept_lg3), lp3: num(r.n_accept_lp3), but: null, master: num(r.n_accept_master), autre: num(r.n_accept_autre), nonInscrit: num(r.n_accept_noninscri) },
    femmesPP: num(r.n_can_femme), rangDernierPP: num(r.rang_dernier),
  };
}
/** Indicateurs dérivés. Définitions : voir docs/INDICATEURS.md */
function derive(s) {
  return {
    ...s,
    tauxProposition: pct(s.propositionsPP, s.candidatsPP), // % des candidats PP ayant reçu une proposition PP
    tauxAcceptation: pct(s.acceptesPP, s.propositionsPP),   // % des propositions PP acceptées
    candidatsParPlace: s.places ? Math.round((s.candidatsPP / s.places) * 10) / 10 : null,
  };
}

// Toutes les lignes (pour repères nationaux) et lignes du périmètre
const all = [];
for (const r of c23) all.push({ s: 2023, ifc: r.ifc, uai: r.eta_uai, mention: r.mention, disc: r.disci_lib, parcours: r.parcours, raw: r, v: from2023(r) });
for (const r of c2425) all.push({ s: Number(r.Session), ifc: r['Identifiant de la formation'], uai: r["Identifiant de l'établissement"], mention: r['Intitulé de la mention'], disc: r.Discipline, parcours: r['Intitulé du parcours'], raw: r, v: from2425(r) });

const inScope = (x) => (norm(x.disc) === DISCIPLINE ? MENTION_GROUPE[norm(x.mention)] ?? (console.warn('Mention hors groupes :', x.mention), null) : null);
const formations = new Map();
for (const x of all) {
  const groupe = inScope(x); if (!groupe) continue;
  const rw = x.raw, is23 = x.s === 2023;
  let f = formations.get(x.ifc);
  const base = is23
    ? { etab: rw.eta_nom, region: rw.acad_reg_lib, academie: rw.acad_lib, secteurId: Number(rw.secteur_disci), secteur: rw.secteur_disci_lib, alternance: rw.alternance === '1', modalite: rw.modalite_enseignement, lieux: rw.lieux_formation }
    : { etab: rw["Libellé de l'établissement"], region: rw['Région académique de l\'établissement'], academie: rw["Académie de l'établissement"], secteurId: Number(rw['Identifiant du secteur disciplinaire']), secteur: rw['Secteur disciplinaire'], alternance: rw.Alternance === '1', modalite: rw["Modalités d'enseignement"], lieux: rw['Lieu(x) de formation'] };
  if (!f) f = { ifc: x.ifc, uai: x.uai, mention: x.mention, parcours: x.parcours, groupe, ...base, sessions: {} };
  else Object.assign(f, base, { groupe }); // la session la plus récente (lue en dernier) fait foi pour les libellés
  f.sessions[x.s] = derive(x.v);
  formations.set(x.ifc, f);
}

// ---------- API : coordonnées + correspondance secteur -> discipline d'insertion ----------
const getJson = async (p) => { const r = await fetch(API + p); if (!r.ok) throw new Error(`${p} : HTTP ${r.status}`); return r.json(); };
const apiSecteurs = await getJson('/secteurs-disciplinaires');

// Position : la ville et le département de l'API Masters-stats sont incohérents pour plusieurs formations
// (ex. Lyon 3 -> « Ampus », Cnam Enjmin -> « Sai »). On part donc du premier lieu de formation déclaré
// sur Mon Master (« ... - VILLE (dept) ») et on le géocode avec l'API Découpage administratif (geo.api.gouv.fr).
const parseSeg = (seg) => {
  const last = seg.trim().split(/\s[-–]\s/).pop();
  const m = last.match(/^(.+?)(?:\s+C[EÉ]DEX(?:\s*\d+)?)?\s*(?:\((\d{2,3}[AB]?)\))?\s*$/i);
  if (!m || (last === seg.trim() && !m[2])) return null;
  const nom = m[1].replace(/\bSTE\b/gi, 'Sainte').replace(/\bST\b/gi, 'Saint').trim();
  return nom.length > 1 ? { nom, dept: m[2] ?? null } : null;
};
// Premier lieu avec département ; à défaut, le premier lieu lisible (les virgules peuvent aussi couper un nom de site).
const parseLieu = (lieux) => {
  const segs = String(lieux ?? '').split(/[,|]/).map(parseSeg).filter(Boolean);
  return segs.find((x) => x.dept) ?? segs[0] ?? null;
};
const geocache = new Map();
async function geocode(l) {
  const key = `${l.nom}|${l.dept}`;
  if (geocache.has(key)) return geocache.get(key);
  let res = null;
  try {
    const url = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(l.nom)}&fields=nom,centre,codeDepartement&boost=population&limit=10`;
    const r = await fetch(url);
    const list = r.ok ? await r.json() : [];
    let pick = l.dept ? list.find((c) => c.codeDepartement.startsWith(l.dept)) : list[0];
    if (!pick && l.nom.includes('-')) { // ex. Cergy-Pontoise : commune « Cergy »
      const l2 = await (await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(l.nom.split('-')[0])}&fields=nom,centre,codeDepartement&boost=population&limit=10`)).json();
      pick = l2.find((c) => !l.dept || c.codeDepartement.startsWith(l.dept));
    }
    if (pick?.centre) res = { ville: pick.nom, dept: pick.codeDepartement, lat: pick.centre.coordinates[1], lon: pick.centre.coordinates[0] };
  } catch { /* hors ligne : formation sans position */ }
  geocache.set(key, res);
  return res;
}
let sansPosition = 0;
for (const f of formations.values()) {
  const l = parseLieu(f.lieux);
  const g = l ? await geocode(l) : null;
  Object.assign(f, g ?? { ville: null, dept: null, lat: null, lon: null }, { positionApprox: false });
  if (!g) sansPosition++;
}
const insDiscBySecteur = Object.fromEntries(apiSecteurs.map((s) => [s.id, s.insDiscId]));
const secteursScope = [...new Set([...formations.values()].map((f) => f.secteurId))];
const discScope = [...new Set(secteursScope.map((id) => insDiscBySecteur[id]).filter(Boolean))].sort();
for (const f of formations.values()) f.insDisc = insDiscBySecteur[f.secteurId] ?? null;

// ---------- Repères nationaux (quantiles, formations avec >= 20 candidats PP) ----------
const q = (arr, p) => { const a = [...arr].sort((x, y) => x - y); if (!a.length) return null; const i = (a.length - 1) * p, lo = Math.floor(i); return Math.round((a[lo] + (a[Math.ceil(i)] - a[lo]) * (i - lo)) * 10) / 10; };
const reperes = {};
for (const s of [2023, 2024, 2025]) {
  const rows = all.filter((x) => x.s === s).map((x) => derive(x.v)).filter((v) => v.candidatsPP >= 20);
  const dist = (key) => { const a = rows.map((v) => v[key]).filter((v) => v != null); return { n: a.length, p10: q(a, 0.1), p25: q(a, 0.25), p50: q(a, 0.5), p75: q(a, 0.75), p90: q(a, 0.9) }; };
  reperes[s] = { formationsTotal: all.filter((x) => x.s === s).length, tauxProposition: dist('tauxProposition'), candidatsParPlace: dist('candidatsParPlace') };
}

// ---------- Insertion professionnelle ----------
const ins = load('fr-esr-insertion_professionnelle-master_2010-2020.csv');
const insRows = ins.filter((r) => discScope.includes(r.code_de_la_discipline)).map((r) => ({
  annee: Number(r.annee), uai: r.numero_de_l_etablissement, etab: r.etablissement, disc: r.code_de_la_discipline, discipline: r.discipline,
  mois: Number(r.situation.replace(/\D/g, '')) || null, diplome: r.diplome,
  reponses: num(r.nombre_de_reponses), tauxReponse: num(r.taux_de_reponse),
  insertion: num(r.taux_dinsertion), emploi: num(r.taux_d_emploi), stables: num(r.emplois_stables),
  cadres: num(r.emplois_cadre_ou_professions_intermediaires), tempsPlein: num(r.emplois_a_temps_plein),
  salaireNet: num(r.salaire_net_median_des_emplois_a_temps_plein), salaireBrut: num(r.salaire_brut_annuel_estime),
  femmes: num(r.femmes), remarque: r.remarque || null,
}));
const uaiScope = new Set([...formations.values()].map((f) => f.uai));

// ---------- Écriture ----------
const list = [...formations.values()].sort((a, b) => a.etab.localeCompare(b.etab) || a.parcours.localeCompare(b.parcours));
const meta = {
  genere: new Date().toISOString().slice(0, 10),
  discipline: 'Lettres, sciences du langage, arts',
  groupes: Object.fromEntries(Object.entries(GROUPES).map(([k, g]) => [k, g.label])),
  mentions: MENTION_LABEL,
  sources: {
    candidatures: 'MESRI-SIES, Mon Master 2023 et 2024-2025 (data.gouv.fr), Licence Ouverte',
    insertion: 'MESRI-SIES, Insertion professionnelle des diplômés de master en universités, 2010-2020 (data.gouv.fr), Licence Ouverte',
    coordonnees: API,
  },
  controles: {
    formationsPerimetre: list.length,
    parSession: Object.fromEntries([2023, 2024, 2025].map((s) => [s, list.filter((f) => f.sessions[s]).length])),
    etablissements: uaiScope.size,
    sansPosition,
    disciplinesInsertion: discScope,
    lignesInsertion: insRows.length,
    etablissementsAvecInsertion: new Set(insRows.filter((r) => uaiScope.has(r.uai)).map((r) => r.uai)).size,
  },
};
// Scripts classiques (et non JSON chargé par fetch) : le site fonctionne aussi ouvert directement depuis le disque (file://).
mkdirSync(join(ROOT, 'js'), { recursive: true });
const banner = '/* Généré par scripts/build-data.mjs : ne pas modifier à la main. Sources : MESRI-SIES (Mon Master, insertion professionnelle), API Masters-stats. */\n';
writeFileSync(join(ROOT, 'js', 'data.js'), `${banner}window.MASTERLAB = ${JSON.stringify({ meta, masters: list, insertion: insRows, reperes })};\n`);
const fond = JSON.parse(readFileSync(join(ROOT, 'assets', 'geo', 'franceRegions.json'), 'utf8'));
writeFileSync(join(ROOT, 'js', 'france-regions.js'), `/* Fond de carte : régions françaises (fichier de la démonstration du cours). */\nwindow.FRANCE_GEO = ${JSON.stringify(fond)};\n`);
console.log(JSON.stringify(meta.controles, null, 1));
