// Lignes : libellé, valeur affichée, valeur à comparer (plus haut = en bleu) ou null si non comparable.
const rows = [
  ['Établissement', (m) => esc(m.etab), null],
  ['Ville', (m) => esc(m.ville || ND), null],
  ['Mention', (m) => esc(mentionLabel(m.mention)), null],
  ['Places', (m) => fmt(S(m).places), (m) => S(m).places],
  ['Candidats', (m) => fmt(S(m).candidatsPP), null],
  ['Taux d’accès', (m) => pc(taux(m)), (m) => taux(m)],
  ['Alternance', (m) => (m.alternance ? 'Oui' : 'Non'), (m) => +m.alternance],
  ['Insertion à 18 mois (discipline)', (m) => pc(insVal(m, 18, 'insertion')), (m) => insVal(m, 18, 'insertion')],
  ['Salaire net médian à 18 mois (discipline)', (m) => eur(insVal(m, 18, 'salaireNet')), (m) => insVal(m, 18, 'salaireNet')],
];

function render() {
  const list = cmps().map(byId).filter(Boolean);
  const others = filterMasters().filter((m) => !list.includes(m));
  $('#add').innerHTML = `<option value="">${list.length >= 3 ? 'Comparateur plein (3 au plus)' : 'Choisir un Master…'}</option>`
    + others.map((m) => `<option value="${esc(m.ifc)}">${esc(m.ville || '')} – ${esc(nom(m))}</option>`).join('');
  $('#add').disabled = list.length >= 3;

  if (!list.length) {
    $('#out').innerHTML = `<div class="card col items-start"><h3>Ton comparateur est vide</h3>
      <p>Ajoute des formations avec le menu ci-dessus, ou avec le bouton « Comparer » de la liste, de la carte ou d’une fiche.</p>
      <a class="btn p" href="formations.html">Parcourir les formations</a></div>`;
    return;
  }
  const best = rows.map(([, , v]) => {
    const vals = v && list.length > 1 ? list.map(v).filter((x) => x != null) : [];
    return vals.length > 1 && new Set(vals).size > 1 ? Math.max(...vals) : null;
  });
  $('#out').innerHTML = `<table class="cmp" style="min-width:${200 + list.length * 200}px">
    <thead><tr><th scope="col">Formation</th>${list.map((m) => `<td><div class="col gap-8">
      <a href="fiche.html?id=${esc(m.ifc)}" class="font-bold">${esc(nom(m))}</a>
      <button class="btn ghost self-start px-0" data-cmp="${esc(m.ifc)}">Retirer</button></div></td>`).join('')}</tr></thead>
    <tbody>${rows.map(([l, show, v], i) => `<tr><th scope="row">${l}</th>${list.map((m) => `<td class="${best[i] !== null && v(m) === best[i] ? 'best' : ''}">${show(m)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;
  syncButtons();
  $$('#out [data-cmp]').forEach((b) => b.textContent = 'Retirer ×');
}
$('#add').addEventListener('change', (e) => { if (!e.target.value) return; store.set('cmp', [...cmps(), e.target.value]); render(); });
document.addEventListener('ml:change', render);
render();
