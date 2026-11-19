// Carte de France ECharts (régions + bulles regroupées + pastilles par formation). Dépend de echarts, FRANCE_GEO et app.js.
// France métropolitaine seulement : les régions d'outre-mer sont retirées du fond de carte (leurs formations sont listées à part).
const OUTRE_MER = ['Guyane', 'Guadeloupe', 'Martinique', 'Mayotte', 'La Réunion'];
echarts.registerMap('France', { ...window.FRANCE_GEO, features: window.FRANCE_GEO.features.filter((f) => !OUTRE_MER.includes(f.properties.nom)) });
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const GROUP_RADIUS = 40; // distance (px) sous laquelle deux villes fusionnent en une seule bulle

/**
 * createMap(el, onClick) → { chart, update({ villes, city, sel }), zoomBy(facteur) }
 * onClick reçoit { city } ou { id }.
 * Les villes proches à l'écran sont regroupées dans une bulle qui additionne leurs formations ;
 * en zoomant, les bulles se séparent et les nombres se répartissent (comme Parcoursup).
 * Le zoom se fait avec ⌘/Ctrl + molette, au pincement du trackpad ou avec les boutons ; la molette seule fait défiler la page.
 */
function createMap(el, onClick) {
  const chart = echarts.init(el, null, { renderer: 'canvas' });
  let st = { villes: [], city: undefined, sel: undefined };
  const px = (lon, lat) => chart.convertToPixel({ geoIndex: 0 }, [lon, lat]);

  /** Regroupe les villes visibles en bulles selon leur distance à l'écran. */
  function bubbles() {
    const out = [];
    for (const v of st.villes.filter((x) => x.ville !== st.city).sort((a, b) => b.ms.length - a.ms.length)) {
      const p = px(v.lon, v.lat);
      if (!p) continue;
      const n = v.ms.length;
      const c = out.find((g) => Math.hypot(g.x - p[0], g.y - p[1]) < GROUP_RADIUS);
      if (c) { c.sx += p[0] * n; c.sy += p[1] * n; c.lon += v.lon * n; c.lat += v.lat * n; c.n += n; c.members.push(v); c.x = c.sx / c.n; c.y = c.sy / c.n; }
      else out.push({ x: p[0], y: p[1], sx: p[0] * n, sy: p[1] * n, lon: v.lon * n, lat: v.lat * n, n, members: [v] });
    }
    return out.map((g) => (g.members.length === 1
      ? { kind: 'city', ville: g.members[0].ville, name: g.members[0].ville, value: [g.members[0].lon, g.members[0].lat, g.n] }
      : { kind: 'cluster', name: `${g.n} formations`, villes: g.members.length, value: [g.lon / g.n, g.lat / g.n, g.n] }));
  }
  const refresh = () => chart.setOption({ series: [{ id: 'bulles', data: bubbles() }] });
  let raf;
  const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(refresh); };

  addEventListener('resize', () => { chart.resize(); later(); });
  chart.on('georoam', later);
  chart.on('click', (p) => {
    const d = p.data;
    if (p.seriesType !== 'scatter' || !d) return;
    if (d.kind === 'city') onClick({ city: d.ville });
    else if (d.kind === 'pin') onClick({ id: d.id });
    else if (d.kind === 'cluster') { // zoom sur le groupe : les villes se séparent
      const g = chart.getOption().geo[0];
      chart.setOption({ geo: { center: [d.value[0], d.value[1]], zoom: Math.min(14, g.zoom * 2.4) } });
      later();
    }
  });

  function zoomBy(f, x = el.clientWidth / 2, y = el.clientHeight / 2) {
    chart.dispatchAction({ type: 'geoRoam', componentType: 'geo', zoom: f, originX: x, originY: y });
    later();
  }
  // ⌘/Ctrl + molette, ou pincement du trackpad (le navigateur l'envoie comme Ctrl + molette) : zoom. Sinon la page défile normalement.
  el.addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    zoomBy(Math.min(1.3, Math.max(0.77, Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.004)))), e.offsetX, e.offsetY);
  }, { passive: false });

  return {
    chart,
    zoomBy,
    update(next) {
      st = { ...st, ...next };
      const c = st.villes.find((v) => v.ville === st.city);
      const blue = css('--blue'), sky = css('--sky'), navy = css('--navy');
      // Pastilles : un cercle autour du centre de la ville (en degrés, adapté au zoom)
      const pins = c ? c.ms.map((m, i) => {
        const a = (i / c.ms.length) * 2 * Math.PI - Math.PI / 2, r = c.ms.length > 1 ? 0.12 : 0;
        return { kind: 'pin', id: m.ifc, name: nom(m), n: i + 1, value: [c.lon + (r * Math.cos(a)) / 0.68, c.lat + r * Math.sin(a)] };
      }) : [];
      chart.setOption({
        animationDurationUpdate: 500,
        animationEasingUpdate: 'cubicOut',
        tooltip: { trigger: 'item', borderColor: '#dde1ee', textStyle: { color: '#0b0d14' }, formatter: (p) => (p.data?.kind === 'city' ? `<b>${esc(p.data.ville)}</b><br>${p.data.value[2]} formation${p.data.value[2] > 1 ? 's' : ''}` : p.data?.kind === 'cluster' ? `<b>${p.data.value[2]} formations</b><br>dans ${p.data.villes} villes · clique pour zoomer` : p.data?.kind === 'pin' ? esc(p.data.name) : esc(p.name)) },
        geo: {
          map: 'France', nameProperty: 'nom', roam: 'move', scaleLimit: { min: 1, max: 14 },
          center: c ? [c.lon, c.lat] : [2.21, 46.22], zoom: c ? 6 : 1, top: 16, bottom: 16, left: 32, right: 32,
          itemStyle: { areaColor: '#fff', borderColor: '#c5cadb', borderWidth: 0.8 },
          emphasis: { itemStyle: { areaColor: css('--blue-soft') }, label: { show: false } },
          select: { disabled: true },
        },
        series: [
          { id: 'bulles', type: 'scatter', coordinateSystem: 'geo', data: [], symbolSize: (v) => Math.min(72, 24 + 6.5 * Math.sqrt(v[2])), itemStyle: { color: blue, borderColor: '#fff', borderWidth: 2, shadowBlur: 8, shadowColor: 'rgba(0,17,224,.35)' }, emphasis: { scale: 1.12 }, label: { show: true, formatter: (p) => p.value[2], color: '#fff', fontWeight: 700 }, z: 3 },
          { id: 'pastilles', type: 'scatter', coordinateSystem: 'geo', data: pins.map((p) => ({ ...p, itemStyle: p.id === st.sel ? { color: navy, borderColor: '#fff', borderWidth: 2 } : undefined })), symbolSize: 32, itemStyle: { color: sky, borderColor: '#fff', borderWidth: 2, shadowBlur: 8, shadowColor: 'rgba(5,22,66,.3)' }, emphasis: { scale: 1.15 }, label: { show: true, formatter: (p) => p.data.n, color: '#fff', fontWeight: 700 }, z: 4 },
        ],
      }, { replaceMerge: ['series'] });
      refresh();
    },
  };
}
