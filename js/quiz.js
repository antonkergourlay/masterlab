// Chaque réponse devient un critère vérifiable sur les données : le résultat dit « X critères sur Y » et lesquels, sans pourcentage inventé.
const POOL = filterMasters();
const medTaux = POOL.map((m) => taux(m)).filter((x) => x != null).sort((a, b) => a - b)[Math.floor(POOL.length / 2)];
const med = (a) => { a = a.filter((x) => x != null).sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
const medPlaces = med(POOL.map((m) => S(m).places));
const medIns = med(POOL.map((m) => insVal(m, 18, 'insertion')));
const groupe = (g) => ({ label: `Groupe « ${GROUPES[g]} »`, test: (m) => m.groupe === g });
const admitted = (m, k) => YEARS.some((y) => (m.sessions[y]?.admisOrigines?.[k] ?? 0) > 0);
const regions = [...new Set(POOL.map((m) => m.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));

// [question, [[libellé, critère | null]]] ; critère = { label, test(m) }
const Q = [
  ['Qu’est-ce qui t’attire le plus ?', [
    ['Créer avec le numérique, le design, l’image et le son', groupe('numerique')],
    ['Pratiquer et créer des œuvres (arts plastiques, mode…)', groupe('arts')],
    ['La scène, la musique, le mouvement', groupe('spectacle')],
    ['Les textes, les langues, le langage', groupe('lettres')],
    ['Le patrimoine et les métiers de la culture', groupe('patrimoine')],
    ['Je ne sais pas encore', null]]],
  ['Quelle est ta formation actuelle ?', [
    ['BUT (MMI ou autre)', { label: 'A admis des titulaires de BUT', test: (m) => admitted(m, 'but') }],
    ['Licence', { label: 'A admis des titulaires de licence', test: (m) => admitted(m, 'lg3') || admitted(m, 'lp3') }],
    ['Autre', null]]],
  ['L’alternance, pour toi c’est…', [
    ['Indispensable', { label: 'Propose l’alternance', test: (m) => m.alternance }],
    ['Un plus', { label: 'Propose l’alternance', test: (m) => m.alternance }],
    ['Pas important', null]]],
  ['Où aimerais-tu étudier ?', [
    ...regions.map((r) => [r, { label: `Située en ${r}`, test: (m) => m.region === r }]),
    ['Peu importe', null]]],
  ['Tu préfères une promotion…', [
    ['Petite, pour un suivi proche', { label: `Moins de ${medPlaces} places`, test: (m) => S(m).places != null && S(m).places < medPlaces }],
    ['Grande, pour un réseau plus large', { label: `${medPlaces} places ou plus`, test: (m) => S(m).places != null && S(m).places >= medPlaces }],
    ['Peu importe', null]]],
  ['L’insertion professionnelle, pour toi…', [
    ['Est un critère majeur', { label: `Insertion à 18 mois de la discipline au-dessus de la médiane (${dec(medIns)} %)`, test: (m) => insVal(m, 18, 'insertion') != null && insVal(m, 18, 'insertion') >= medIns }],
    ['Compte, sans plus', null]]],
  ['Côté sélectivité, tu…', [
    ['Vises les Masters les plus demandés', { label: `Taux d’accès sous la médiane (${dec(medTaux)} %)`, test: (m) => taux(m) != null && taux(m) < medTaux }],
    ['Préfères maximiser tes chances', { label: `Taux d’accès au-dessus de la médiane (${dec(medTaux)} %)`, test: (m) => taux(m) != null && taux(m) >= medTaux }],
    ['N’as pas de préférence', null]]],
];
const answers = [];
let step = 0;

function score() {
  const crit = answers.map((a, q) => Q[q][1][a]?.[1]).filter(Boolean);
  return POOL.map((m) => {
    const ok = crit.filter((c) => c.test(m));
    return { m, ok: ok.map((c) => c.label), ko: crit.filter((c) => !c.test(m)).map((c) => c.label), n: ok.length, total: crit.length };
  }).sort((a, b) => b.n - a.n || (taux(b.m) ?? 0) - (taux(a.m) ?? 0));
}

function render() {
  const el = $('#quiz');
  if (step < Q.length) {
    const [q, opts] = Q[step];
    el.innerHTML = `
      <div class="col gap-8"><p class="eyebrow">Question ${step + 1} sur ${Q.length}</p><div class="progress"><i style="--p:${(step + 1) / Q.length * 100}%"></i></div></div>
      <h1 class="fs-32">${q}</h1>
      <div class="opts">${opts.map(([l], i) => `<button class="opt" data-a="${i}" aria-pressed="${answers[step] === i}">${esc(l)}</button>`).join('')}</div>
      <div class="row between">
        <button class="btn" id="prev" ${step ? '' : 'disabled'}>← Précédent</button>
        <a href="carte.html">Passer le quiz</a>
        <button class="btn p" id="next" ${answers[step] === undefined ? 'disabled' : ''}>${step === Q.length - 1 ? 'Voir mes résultats' : 'Suivant →'}</button>
      </div>`;
    return;
  }
  const res = score().slice(0, 3);
  el.innerHTML = `
    <div><p class="eyebrow">Résultats du quiz</p><h1 class="fs-34">Les 3 Masters qui te ressemblent</h1>
    <p class="muted mt-8">Classement par nombre de critères remplis parmi ceux que tu as choisis, à égalité par taux d’accès. Ce n’est pas une probabilité d’admission.</p></div>
    ${res.map(({ m, ok, ko, n, total }) => card(m, `<div class="row gap-10"><span class="score">${total ? `${n} critère${n > 1 ? 's' : ''} sur ${total}` : 'Aucun critère choisi'}</span></div>
      <ul class="m-0 pl-18">${ok.map((w) => `<li>${esc(w)}</li>`).join('')}${ko.map((w) => `<li class="muted">Non : ${esc(w)}</li>`).join('')}</ul>
      <a href="carte.html#${encodeURIComponent(m.ville + '/' + m.ifc)}">Voir sur la carte →</a>`)).join('')}
    <div class="row"><button class="btn" id="again">Refaire le quiz</button><a class="btn p" href="formations.html">Voir toutes les formations</a></div>`;
  syncButtons();
}

$('#quiz').addEventListener('click', (e) => {
  const a = e.target.closest('[data-a]');
  if (a) { answers[step] = +a.dataset.a; render(); }
  if (e.target.closest('#next')) { step++; render(); scrollTo(0, 0); }
  if (e.target.closest('#prev')) { step--; render(); }
  if (e.target.closest('#again')) { answers.length = 0; step = 0; render(); }
});
render();
