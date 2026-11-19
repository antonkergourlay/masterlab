// Carte de France ECharts (régions + bulles par ville + pastilles par formation). Dépend de echarts, FRANCE_GEO et app.js.
// France métropolitaine seulement : les régions d'outre-mer sont retirées du fond de carte (leurs formations sont listées à part).
const OUTRE_MER = ['Guyane', 'Guadeloupe', 'Martinique', 'Mayotte', 'La Réunion'];
echarts.registerMap('France', { ...window.FRANCE_GEO, features: window.FRANCE_GEO.features.filter((f) => !OUTRE_MER.includes(f.properties.nom)) });
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

/** createMap(el, onClick) → { update({ villes, city, sel }) } ; onClick reçoit { city } ou { id }. */
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
      const blue = css('--blue'), sky = css('--sky'), navy = css('--navy');
      const bubbles = villes.filter((v) => v !== c).map((v) => ({ kind: 'city', ville: v.ville, name: v.ville, value: [v.lon, v.lat, v.ms.length] }));
      // Pastilles : un cercle autour du centre de la ville (en degrés, adapté au zoom)
      const pins = c ? c.ms.map((m, i) => {
        const a = (i / c.ms.length) * 2 * Math.PI - Math.PI / 2, r = c.ms.length > 1 ? 0.12 : 0;
        return { kind: 'pin', id: m.ifc, name: nom(m), n: i + 1, value: [c.lon + (r * Math.cos(a)) / 0.68, c.lat + r * Math.sin(a)] };
      }) : [];
      chart.setOption({
        animationDurationUpdate: 600,
        animationEasingUpdate: 'cubicOut',
        tooltip: { trigger: 'item', borderColor: '#dde1ee', textStyle: { color: '#0b0d14' }, formatter: (p) => (p.data?.kind === 'city' ? `<b>${esc(p.data.ville)}</b><br>${p.data.value[2]} formation${p.data.value[2] > 1 ? 's' : ''}` : p.data?.kind === 'pin' ? esc(p.data.name) : esc(p.name)) },
        geo: {
          map: 'France', nameProperty: 'nom', roam: true, scaleLimit: { min: 1, max: 14 },
          center: c ? [c.lon, c.lat] : [2.6, 46.6], zoom: c ? 6 : 1, top: 12, bottom: 12,
          itemStyle: { areaColor: '#fff', borderColor: '#c5cadb', borderWidth: 0.8 },
          emphasis: { itemStyle: { areaColor: css('--blue-soft') }, label: { show: false } },
          select: { disabled: true },
        },
        series: [
          { type: 'scatter', coordinateSystem: 'geo', data: bubbles, symbolSize: (v) => 22 + 7 * Math.sqrt(v[2]), itemStyle: { color: blue, borderColor: '#fff', borderWidth: 2, shadowBlur: 8, shadowColor: 'rgba(0,17,224,.35)' }, emphasis: { scale: 1.15 }, label: { show: true, formatter: (p) => p.value[2], color: '#fff', fontWeight: 700 }, z: 3 },
          { type: 'scatter', coordinateSystem: 'geo', data: pins.map((p) => ({ ...p, itemStyle: p.id === sel ? { color: navy, borderColor: '#fff', borderWidth: 2 } : undefined })), symbolSize: 32, itemStyle: { color: sky, borderColor: '#fff', borderWidth: 2, shadowBlur: 8, shadowColor: 'rgba(5,22,66,.3)' }, emphasis: { scale: 1.15 }, label: { show: true, formatter: (p) => p.data.n, color: '#fff', fontWeight: 700 }, z: 4 },
        ],
      }, { replaceMerge: ['series'] });
    },
  };
}
