// Carte de France ECharts (régions + bulles par ville + pastilles par formation). Dépend de echarts, FRANCE_GEO et app.js.
// Outre-mer : encarts via specialAreas, comme dans la démo du cours (demoMap.js).
const SPECIAL = {
  'Guyane': { left: -7.834939110760255, top: 48.19, width: 3 },
  'Guadeloupe': { left: -7.834939110760255, top: 46, width: 2 },
  'Martinique': { left: -7.834939110760255, top: 44, width: 2 },
  'Mayotte': { left: -7.834939110760255, top: 42, width: 2 },
  'La Réunion': { left: -7.834939110760255, top: 40, width: 2 },
};
echarts.registerMap('France', window.FRANCE_GEO, SPECIAL);
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

/** createMap(el, onClick) → { update({ villes, city, sel }) } ; onClick reçoit { city } ou { id } ou { reset }. */
function createMap(el, onClick) {
  const chart = echarts.init(el, null, { renderer: 'canvas' });
  addEventListener('resize', () => chart.resize());
  chart.on('click', (p) => {
    const d = p.data;
    if (p.seriesType === 'scatter' && d?.kind === 'city') onClick({ city: d.ville });
    else if (p.seriesType === 'scatter' && d?.kind === 'pin') onClick({ id: d.id });
  });
  return {
    chart,
    update({ villes, city, sel }) {
      const c = villes.find((v) => v.ville === city);
      const blue = css('--blue'), saffron = css('--saffron'), dark = css('--dark');
      const bubbles = villes.filter((v) => v !== c).map((v) => ({ kind: 'city', ville: v.ville, name: v.ville, value: [v.lon, v.lat, v.ms.length] }));
      // Pastilles : un cercle autour du centre de la ville (en degrés, adapté au zoom)
      const pins = c ? c.ms.map((m, i) => {
        const a = (i / c.ms.length) * 2 * Math.PI - Math.PI / 2, r = c.ms.length > 1 ? 0.12 : 0;
        return { kind: 'pin', id: m.ifc, name: nom(m), n: i + 1, value: [c.lon + (r * Math.cos(a)) / 0.68, c.lat + r * Math.sin(a)] };
      }) : [];
      chart.setOption({
        animationDurationUpdate: 500,
        tooltip: { trigger: 'item', formatter: (p) => (p.data?.kind === 'city' ? `${esc(p.data.ville)} : ${p.data.value[2]} formation${p.data.value[2] > 1 ? 's' : ''}` : p.data?.kind === 'pin' ? esc(p.data.name) : esc(p.name)) },
        geo: {
          map: 'France', nameProperty: 'nom', roam: true, scaleLimit: { min: 1, max: 14 },
          center: c ? [c.lon, c.lat] : [2.4, 46.4], zoom: c ? 6 : 1.05, top: 8, bottom: 8,
          itemStyle: { areaColor: '#fff', borderColor: '#b9bec6', borderWidth: 0.8 },
          emphasis: { itemStyle: { areaColor: css('--blue-soft') }, label: { show: false } },
          select: { disabled: true },
        },
        series: [
          { type: 'scatter', coordinateSystem: 'geo', data: bubbles, symbolSize: (v) => 20 + 7 * Math.sqrt(v[2]), itemStyle: { color: blue, borderColor: '#fff', borderWidth: 2 }, label: { show: true, formatter: (p) => p.value[2], color: '#fff', fontWeight: 700 }, z: 3 },
          { type: 'scatter', coordinateSystem: 'geo', data: pins.map((p) => ({ ...p, itemStyle: p.id === sel ? { color: dark, borderColor: '#fff', borderWidth: 2 } : undefined })), symbolSize: 30, itemStyle: { color: saffron, borderColor: '#fff', borderWidth: 2 }, label: { show: true, formatter: (p) => p.data.n, color: dark, fontWeight: 700 }, z: 4 },
        ],
      }, { replaceMerge: ['series'] });
    },
  };
}
