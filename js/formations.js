$('#taux-help').innerHTML = help(DEF.taux);
$('#groupe').innerHTML = groupeOptions();
$('#mention').innerHTML = mentionOptions();
['q', 'zone', 'groupe', 'mention'].forEach((k) => $('#' + k).value = params.get(k) || '');
const last = (f) => (a, b) => (f(b) ?? -1) - (f(a) ?? -1); // valeurs absentes en dernier
const sorts = {
  taux: last((m) => taux(m)), places: last((m) => S(m).places), cand: last((m) => S(m).candidatsPP),
  emploi: last((m) => insVal(m, 18, 'insertion')), nom: (a, b) => a.ville.localeCompare(b.ville),
};

function render() {
  const f = { q: $('#q').value, zone: $('#zone').value, groupe: $('#groupe').value, mention: $('#mention').value, alt: $('#alt').checked, tauxMin: +$('#taux-min').value };
  const list = filterMasters(f).sort(sorts[$('#sort').value]);
  const qs = new URLSearchParams(Object.entries({ q: f.q, zone: f.zone, groupe: f.groupe, mention: f.mention }).filter(([, v]) => v)).toString();
  history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  $('#to-map').href = 'carte.html' + (qs ? '?' + qs : '');
  $('#count').textContent = `${list.length} Master${list.length > 1 ? 's' : ''} · session 2025`;
  $('#list').innerHTML = list.map((m) => card(m)).join('') || '<div class="card col"><h3>Aucun résultat</h3><p>Essaie un autre mot-clé ou retire un filtre.</p><button class="btn" data-clear>Effacer les filtres</button></div>';
  syncButtons();
}
const clear = () => { $$('#filters input[type=search]').forEach((i) => i.value = ''); $('#groupe').value = $('#mention').value = ''; $('#alt').checked = false; $('#taux-min').value = 0; render(); };
let timer;
$$('#filters input, #filters select, #sort').forEach((el) => el.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(render, el.type === 'search' ? 250 : 0); }));
$('#clear').addEventListener('click', clear);
document.addEventListener('click', (e) => { if (e.target.closest('[data-clear]')) clear(); });
$('#filters-btn').addEventListener('click', (e) => e.currentTarget.setAttribute('aria-expanded', $('#filters').classList.toggle('open')));
render();
