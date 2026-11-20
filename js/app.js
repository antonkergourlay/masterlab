// Master Lab : éléments communs (données, calculs, recherche, en-tête, pied de page, info-bulles, comparateur).
// Scripts classiques (pas de modules) : le site s'ouvre aussi directement depuis le disque.
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const params = new URLSearchParams(location.search);

/* ---------- Données (js/data.js, généré par scripts/build-data.mjs) ---------- */
const D = window.MASTERLAB;
const MASTERS = D.masters;
const YEARS = [2023, 2024, 2025];
const LAST = 2025;
const ND = 'n.d.';
const byId = (id) => MASTERS.find((m) => m.ifc === id);
const MENTIONS = D.meta.mentions; // clé nationale (majuscules) -> libellé
const GROUPES = D.meta.groupes;   // id -> libellé ; chaque formation a un champ groupe
const INS_DISC = { disc06: 'Lettres, langues, arts' };
const mentionLabel = (m) => MENTIONS[m] ?? m;

/* ---------- Mise en forme : une valeur absente s'affiche « n.d. », jamais 0 ---------- */
const nf = new Intl.NumberFormat('fr-FR');
const fmt = (n) => (n == null ? ND : nf.format(n));
const dec = (n, d = 1) => (n == null ? ND : n.toLocaleString('fr-FR', { maximumFractionDigits: d }));
const pc = (n, d = 0) => (n == null ? ND : `${dec(n, d)} %`);
const eur = (n) => (n == null ? ND : `${nf.format(Math.round(n))} €`);
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const titleCase = (s) => String(s ?? '').toLowerCase().replace(/(^|[\s\-'’(])(\p{L})/gu, (m, p, c) => p + c.toUpperCase()).replace(/ (De|Du|Des|La|Le|Les|Et|En|Sur|Sous) /g, (m, w) => ` ${w.toLowerCase()} `).replace(/([\s-])([DL])(['’])/g, (m, p, c, a) => p + c.toLowerCase() + a);
MASTERS.forEach((m) => { if (m.ville) m.ville = titleCase(m.ville); }); // la source donne les villes en capitales

/* ---------- Indicateurs ---------- */
/** Session affichée : la plus récente où la formation existe. */
const S = (m, y = LAST) => m.sessions[y] ?? m.sessions[[...YEARS].reverse().find((a) => m.sessions[a])];
const taux = (m, y) => S(m, y).tauxProposition; // « taux d'accès » : voir DEF.taux
const nom = (m) => (!m.parcours || norm(m.parcours) === norm(mentionLabel(m.mention)) ? mentionLabel(m.mention) : `${mentionLabel(m.mention)} – ${m.parcours}`);
const DEF = {
  taux: "Part des candidats de la phase principale qui ont reçu une proposition d'admission en phase principale. Calcul Master Lab (propositions ÷ candidats) : ce n'est pas un taux officiel ni votre probabilité d'être admis. Pour l'alternance, les propositions dépendent surtout des contrats d'apprentissage : le taux est naturellement bas.",
  candidats: "Candidats ayant confirmé une candidature à cette formation en phase principale. Une même personne candidate à plusieurs formations : on ne peut pas additionner les candidats de formations différentes.",
  places: "Capacité d'accueil déclarée par la formation sur Mon Master.",
  insertion: "Discipline de l'établissement, tous Masters confondus (pas cette formation seule), pour les diplômés jusqu'en 2020. Les valeurs « ns » (échantillon trop petit) ne sont pas affichées.",
  origine: "Source : Mon Master 2024-2025 (MESRI-SIES). Pour chaque formation, nombre de candidats ayant accepté une proposition, selon ce qu'ils faisaient l'année précédente : licence 3, licence professionnelle, BUT, master, autre formation ou aucune formation supérieure en France. Pour 2023, le fichier ne distingue pas le BUT.",
};
/** Info-bulle « ? » : le contenu est lu au clic par le gestionnaire plus bas. */
const help = (txt, label = 'Définition') => `<span class="help"><button type="button" class="help-btn" data-help="${esc(txt)}" aria-label="${esc(label)}" aria-expanded="false">?</button></span>`;

/** Insertion : dernière promotion avec une valeur significative pour (établissement, discipline, délai). */
const INS = new Map();
D.insertion.forEach((r) => { const k = `${r.uai}|${r.disc}|${r.mois}`; (INS.get(k) ?? INS.set(k, []).get(k)).push(r); });
const insRows = (m, mois) => INS.get(`${m.uai}|${m.insDisc}|${mois}`) ?? [];
function insPoint(m, mois, key) {
  let best = null;
  for (const r of insRows(m, mois)) if (r[key] != null && (!best || r.annee > best.annee)) best = r;
  return best;
}
const insVal = (m, mois, key) => insPoint(m, mois, key)?.[key] ?? null;

/* ---------- Recherche tolérante : accents, pluriels, tirets, « st » = « saint », une faute de frappe ---------- */
const canon = (s) => norm(s).replace(/['’\-_/(),.]/g, ' ').replace(/\bste\b/g, 'sainte').replace(/\bst\b/g, 'saint').replace(/\s+/g, ' ').trim();
const stem = (w) => (w.length > 3 ? w.replace(/[sx]$/, '') : w);
function within1(a, b) { // distance d'édition <= 1
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, diff = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++diff > 1) return false;
    if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; }
  }
  return diff + (a.length - i) + (b.length - j) <= 1;
}
const hayCache = new Map();
const hay = (m) => hayCache.get(m) ?? (hayCache.set(m, canon([m.mention, mentionLabel(m.mention), GROUPES[m.groupe], m.parcours, m.etab, m.ville, m.region, m.secteur].join(' '))), hayCache.get(m));
/** Tous les mots de la requête doivent se retrouver dans le texte (sous-chaîne, ou mot à une faute près). */
function matches(text, query) {
  const words = canon(query).split(' ').filter(Boolean);
  if (!words.length) return true;
  const tokens = text.split(' ').map(stem);
  return words.every((w) => {
    const s = stem(w);
    return text.includes(s) || (s.length >= 5 && tokens.some((t) => within1(t, s)));
  });
}
/** Zone : ville, région ou académie. Aucun filtre par défaut : toute la discipline, session 2025. */
function filterMasters({ q = '', zone = '', groupe = '', mention = '', alt = false, tauxMin = 0 } = {}) {
  return MASTERS.filter((m) => {
    if (!m.sessions[LAST]) return false; // formation absente de la session 2025
    return matches(hay(m), q)
      && matches(canon(`${m.ville} ${m.region} ${m.academie}`), zone)
      && (!groupe || m.groupe === groupe)
      && (!mention || m.mention === mention)
      && (!alt || m.alternance)
      && (tauxMin <= 0 || (taux(m) != null && taux(m) >= tauxMin));
  });
}

/** Listes déroulantes : groupes de mentions, puis mentions rangées par groupe. */
const groupeOptions = (first = 'Tous les groupes') => `<option value="">${first}</option>` + Object.entries(GROUPES).map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join('');
const mentionOptions = (first = 'Toutes') => `<option value="">${first}</option>` + Object.entries(GROUPES).map(([g, gl]) => `<optgroup label="${esc(gl)}">${Object.entries(MENTIONS).filter(([k]) => MASTERS.some((m) => m.mention === k && m.groupe === g)).map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join('')}</optgroup>`).join('');

/* ---------- Mémoire du navigateur (seule la sélection du comparateur y est gardée) ---------- */
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('ml_' + k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('ml_' + k, JSON.stringify(v)); } catch { /* stockage indisponible */ } },
};

/* ---------- En-tête, pied de page, menu burger ---------- */
const page = document.body.dataset.page;
const link = (href, label, key) => `<a href="${href}"${key === page ? ' class="on" aria-current="page"' : ''}>${label}</a>`;
document.body.insertAdjacentHTML('afterbegin', `
<a class="skip" href="#main">Aller au contenu</a>
<header class="hd">
  <button class="burger" aria-label="Menu" aria-expanded="false"></button>
  <a class="logo" href="index.html" aria-label="Master Lab, accueil"><img src="assets/logo.svg" alt="">MasterLab</a>
  <nav aria-label="Navigation principale">
    ${link('index.html', 'Accueil', 'accueil')}
    ${link('carte.html', 'Carte interactive', 'carte')}
    ${link('formations.html', 'Formations', 'formations')}
    ${link('comparateur.html', 'Comparateur', 'comparateur')}
    ${link('quiz.html', 'Quiz', 'quiz')}
  </nav>
  <span></span>
</header>`);
document.body.insertAdjacentHTML('beforeend', `
<footer class="ft">
  <div class="in">
    <div>
      <div class="brand"><img src="assets/logo.svg" alt="">MasterLab</div>
      <p>Les Masters publics de lettres, langage et arts.</p>
      <p>Loïs Hesnault, Anton Kergourlay, Ezechiel Fouiden Oster, William Beslon, Nathan Vacher</p>
    </div>
    <div>
      <h4>Explorer</h4>
      <ul><li><a href="carte.html">Carte interactive</a></li><li><a href="formations.html">Toutes les formations</a></li><li><a href="comparateur.html">Comparateur</a></li><li><a href="quiz.html">Quiz de profil</a></li></ul>
    </div>
    <div>
      <h4>Données</h4>
      <ul>
        <li><a href="https://www.data.gouv.fr/" target="_blank" rel="noopener">Mon Master 2023-2025</a></li>
        <li><a href="https://www.data.gouv.fr/" target="_blank" rel="noopener">Insertion pro 2010-2020</a></li>
        <li><a href="https://www.monmaster.gouv.fr/" target="_blank" rel="noopener">Site officiel Mon Master</a></li>
      </ul>
    </div>
    <div class="base"><span>© 2026 Master Lab · SAÉ 3.01 / 3.03, BUT MMI Laval · Données du ${esc(D.meta.genere)} · MESRI-SIES, Licence Ouverte</span><span>Le taux d’accès est un calcul Master Lab, pas un taux officiel.</span></div>
  </div>
</footer>`);
const main = $('main'); if (main) { main.id ||= 'main'; main.tabIndex = -1; $('.skip').href = '#' + main.id; }
const hd = $('.hd'), burger = $('.burger', hd);
const setMenu = (open) => { hd.classList.toggle('open', open); burger.setAttribute('aria-expanded', open); };
burger.addEventListener('click', () => setMenu(!hd.classList.contains('open')));
document.addEventListener('click', (e) => { if (!hd.contains(e.target)) setMenu(false); }); // le volet recouvre la page : un clic ailleurs le ferme
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

/* ---------- Info-bulles « ? » : clic ou survol pour ouvrir ; clic ailleurs, Échap ou défilement pour fermer ---------- */
let pop = null, popBtn = null, pinned = false;
function closePop() { pop?.remove(); popBtn?.setAttribute('aria-expanded', 'false'); pop = popBtn = null; pinned = false; }
function openPop(btn) {
  if (popBtn === btn) return;
  closePop();
  pop = document.createElement('div');
  pop.className = 'help-pop'; pop.setAttribute('role', 'tooltip'); pop.textContent = btn.dataset.help;
  document.body.appendChild(pop);
  const r = btn.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
  const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), innerWidth - w - 12);
  const top = r.bottom + 10 + h > innerHeight - 8 ? Math.max(8, r.top - h - 10) : r.bottom + 10;
  pop.style.left = `${left}px`; pop.style.top = `${top}px`;
  btn.setAttribute('aria-expanded', 'true'); popBtn = btn;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('.help-btn');
  if (b) { if (popBtn === b && pinned) closePop(); else { openPop(b); pinned = true; } e.stopPropagation(); return; }
  if (pop && !e.target.closest('.help-pop')) closePop();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePop(); });
addEventListener('scroll', closePop, { passive: true });
addEventListener('resize', closePop);
if (matchMedia('(hover: hover)').matches) {
  document.addEventListener('mouseover', (e) => { const b = e.target.closest('.help-btn'); if (b) openPop(b); });
  document.addEventListener('mouseout', (e) => { if (!pinned && e.target.closest('.help-btn')) closePop(); });
}

/* Messages courts */
function toast(msg) {
  $('.toast')?.remove();
  document.body.insertAdjacentHTML('beforeend', `<div class="toast" role="status">${esc(msg)}</div>`);
  setTimeout(() => $('.toast')?.remove(), 2600);
}

/** Chiffre qui monte de 0 à sa valeur (sauf si l'utilisateur préfère moins de mouvement). */
function countUp(el, to, format = fmt) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !isFinite(to)) { el.textContent = format(to); return; }
  const t0 = performance.now(), dur = 600;
  const step = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = format(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/* ---------- Comparateur (3 formations au plus, mémorisé dans ce navigateur) ---------- */
const cmps = () => store.get('cmp', []);
function syncButtons() {
  $$('[data-cmp]').forEach((b) => { const on = cmps().includes(b.dataset.cmp); b.setAttribute('aria-pressed', on); b.textContent = on ? '✓ Comparé' : 'Comparer'; });
}
document.addEventListener('click', (e) => {
  const cmp = e.target.closest('[data-cmp]');
  if (!cmp) return;
  const id = cmp.dataset.cmp, list = cmps();
  if (list.includes(id)) { store.set('cmp', list.filter((x) => x !== id)); toast('Retiré du comparateur'); }
  else if (list.length >= 3) toast('3 formations au plus dans le comparateur');
  else { store.set('cmp', [...list, id]); toast(`Ajouté au comparateur (${list.length + 1}/3)`); }
  syncButtons(); document.dispatchEvent(new Event('ml:change'));
});

/* ---------- Carte de formation (liste, quiz) ---------- */
const chips = (m) => `<div class="chips"><span class="chip">${fmt(S(m).places)} places</span><span class="chip">Taux d’accès ${pc(taux(m))}</span>${m.alternance ? '<span class="chip">Alternance</span>' : ''}</div>`;
const card = (m, extra = '') => `
<article class="fc">
  <div class="grow col" style="gap:8px">
    <p class="eyebrow">${esc(m.etab)}${m.ville ? ` · ${esc(m.ville)}` : ''}</p>
    <h3><a href="fiche.html?id=${esc(m.ifc)}">${esc(nom(m))}</a></h3>
    ${chips(m)}${extra}
  </div>
  <div class="acts">
    <a class="btn p" href="fiche.html?id=${esc(m.ifc)}">Voir la formation</a>
    <button class="btn" data-cmp="${esc(m.ifc)}"></button>
  </div>
</article>`;

/* ---------- Villes : regroupement des formations pour la carte ---------- */
/** L'outre-mer et les formations sans coordonnées ne sont pas placées (hors carte). */
function byCity(list) {
  const cities = new Map(), hors = [];
  for (const m of list) {
    if (m.lat == null || m.lon == null || m.lon < -25 || m.lat < 30) { hors.push(m); continue; }
    (cities.get(m.ville) ?? cities.set(m.ville, { ville: m.ville, ms: [] }).get(m.ville)).ms.push(m);
  }
  const villes = [...cities.values()].map((c) => ({ ...c, lat: c.ms.reduce((a, m) => a + m.lat, 0) / c.ms.length, lon: c.ms.reduce((a, m) => a + m.lon, 0) / c.ms.length }));
  return { villes, hors };
}

syncButtons();
