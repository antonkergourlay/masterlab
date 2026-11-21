$('#groupe').innerHTML = groupeOptions();
const list = filterMasters(), { villes } = byCity(list);
const map = createMap($('#emap'), (e) => { if (e.city) location.href = 'carte.html#' + encodeURIComponent(e.city); });
map.update({ villes });

const sum = (k) => list.reduce((a, m) => a + (S(m)[k] ?? 0), 0);
const tx = list.map((m) => taux(m)).filter((x) => x != null).sort((a, b) => a - b);
$('#scope').textContent = `Session 2025 de Mon Master, ${list.length} formations de la discipline « Lettres, sciences du langage, arts » (${Object.keys(MENTIONS).length} mentions, ${Object.keys(GROUPES).length} groupes).`;
const kp = [
  [list.length, 'Masters référencés', fmt],
  [sum('places'), 'Places offertes', fmt],
  [sum('candidatsPP'), 'Candidatures (phase principale)', fmt],
  [tx[Math.floor(tx.length / 2)], `Taux d’accès médian ${help(DEF.taux)}`, (n) => `${n} %`],
];
$('#kpis').innerHTML = kp.map(([, l]) => `<div class="kpi"><b>0</b><span>${l}</span></div>`).join('');
$$('#kpis b').forEach((b, i) => countUp(b, kp[i][0], kp[i][2]));

const rows = villes.map((c) => [c.ville, c.ms.reduce((a, m) => a + (S(m).candidatsPP ?? 0), 0)]).sort((a, b) => b[1] - a[1]).slice(0, 10);
$('#villes').innerHTML = rows.map(([v, n]) => `<div class="hbar"><span>${esc(v)}</span><i style="--w:${n / rows[0][1] * 100}%"></i><b>${fmt(n)}</b></div>`).join('');
