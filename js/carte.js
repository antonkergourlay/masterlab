$('#groupe').innerHTML = groupeOptions();
$('#mention').innerHTML = mentionOptions();
const f = { q: params.get('q') || '', zone: params.get('zone') || '', groupe: params.get('groupe') || '', mention: params.get('mention') || '', alt: false, tauxMin: 0 };
['q', 'zone', 'groupe', 'mention'].forEach((k) => $('#' + k).value = f[k]);
// État de la carte dans l'adresse (#Ville/id) : au retour d'une fiche, la carte revient au même zoom.
let [city, sel] = decodeURIComponent(location.hash.slice(1)).split('/');
const map = createMap($('#emap'), (e) => {
  if (e.city) { city = e.city; sel = undefined; } else if (e.id) { sel = e.id; city = byId(sel).ville; }
  render();
  if (innerWidth <= 700) $('#panel').scrollIntoView({ behavior: 'smooth' });
});
const queryString = () => new URLSearchParams(Object.entries({ q: f.q, zone: f.zone, groupe: f.groupe, mention: f.mention }).filter(([, v]) => v)).toString();

function render() {
  const list = filterMasters(f), { villes, hors } = byCity(list);
  const c = villes.find((x) => x.ville === city);
  if (!c) city = sel = undefined;
  if (!c?.ms.some((m) => m.ifc === sel)) sel = undefined;
  const qs = queryString();
  history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + (city ? '#' + encodeURIComponent(city + (sel ? '/' + sel : '')) : ''));
  map.update({ villes, city, sel });
  $('[data-reset]').hidden = !c;
  $('#sub').textContent = `${list.length} formation${list.length > 1 ? 's' : ''} · session 2025 · France métropolitaine`;

  const horsHtml = hors.length ? `<p class="muted">${hors.length} formation${hors.length > 1 ? 's' : ''} hors de la carte (outre-mer ou lieu non localisé) : <a href="formations.html${qs ? '?' + qs : ''}">voir dans la liste</a>.</p>` : '';
  const m = sel && byId(sel);
  $('#panel').innerHTML = m ? `
    <button class="back" data-back>Formations à ${esc(m.ville)}</button>
    <p class="eyebrow">${esc(m.etab)} · ${esc(m.ville)}</p>
    <h2 class="m-0">${esc(nom(m))}</h2>
    <p class="muted m-0">${esc(GROUPES[m.groupe])} · discipline Lettres, sciences du langage, arts</p>
    ${chips(m)}
    <div class="grid cols-2 cols-m-2 gap-10">
      <div class="kpi"><b>${fmt(S(m).places)}</b><span>Places</span></div>
      <div class="kpi"><b>${pc(taux(m))}</b><span>Taux d’accès ${help(DEF.taux)}</span></div>
      <div class="kpi"><b>${fmt(S(m).candidatsPP)}</b><span>Candidats</span></div>
      <div class="kpi"><b>${pc(insVal(m, 18, 'insertion'))}</b><span>Insertion à 18 mois ${help(DEF.insertion)}</span></div>
    </div>
    <a class="btn p" href="fiche.html?id=${esc(m.ifc)}">Voir la formation</a>
    <button class="btn" data-cmp="${esc(m.ifc)}"></button>`
  : c ? `
    <p class="eyebrow">${c.ms.length} formation${c.ms.length > 1 ? 's' : ''}</p>
    <h2 class="m-0">${esc(c.ville)}</h2>
    ${c.ms.map((x, i) => `<button class="mini" data-id="${esc(x.ifc)}"><span class="eyebrow">${i + 1} · ${esc(x.etab)}</span><br><b>${esc(nom(x))}</b><br>${chips(x)}</button>`).join('')}`
  : list.length ? `
    <h2 class="m-0">${list.length} formation${list.length > 1 ? 's' : ''} trouvée${list.length > 1 ? 's' : ''}</h2>
    <p>Clique sur une bulle ou une ville pour zoomer.</p>
    ${villes.slice().sort((a, b) => b.ms.length - a.ms.length).map((x) => `<button class="mini" data-city="${esc(x.ville)}"><b>${esc(x.ville)}</b> <span class="muted">· ${x.ms.length} formation${x.ms.length > 1 ? 's' : ''}</span></button>`).join('')}
    ${horsHtml}<a href="formations.html${qs ? '?' + qs : ''}">Voir ces résultats en liste →</a>`
  : '<h2 class="m-0">Aucune formation</h2><p>Aucun Master ne correspond à ces critères. Élargis ta recherche.</p><a class="btn" href="carte.html">Effacer la recherche</a>';
  syncButtons();
}

// Liste de villes et bouton de retour (la carte gère ses propres clics)
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-city],[data-id],[data-reset],[data-back]');
  if (!t || !t.closest('#map, #panel')) return;
  if (t.dataset.city) { city = t.dataset.city; sel = undefined; }
  else if (t.dataset.id) { sel = t.dataset.id; city = byId(sel).ville; }
  else if (t.hasAttribute('data-reset')) city = sel = undefined;
  else sel = undefined;
  render();
});
// Les filtres s'appliquent au fil de la saisie (sans attendre le bouton)
let timer;
const apply = () => { ['q', 'zone', 'groupe', 'mention'].forEach((k) => f[k] = $('#' + k).value); f.alt = $('#alt').checked; f.tauxMin = +$('#taux-min').value; city = sel = undefined; render(); };
$('#search').addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(apply, e.target.type === 'search' ? 250 : 0); });
$('#search').addEventListener('submit', (e) => { e.preventDefault(); apply(); });
$$('[data-zoom]').forEach((b) => b.addEventListener('click', () => map.zoomBy(+b.dataset.zoom)));
$('#tb-toggle').addEventListener('click', (e) => { const o = $('#search').classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', o); e.currentTarget.textContent = o ? 'Moins de filtres' : 'Plus de filtres'; });
render();
