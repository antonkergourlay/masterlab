// Carte Leaflet (fond OpenStreetMap / CARTO, sans clé) avec regroupement dynamique des villes (leaflet.markercluster).
// Dépend de vendor/leaflet, de vendor/leaflet/leaflet.markercluster.js et de app.js (esc).
const FRANCE = [[41.2, -5.4], [51.2, 9.8]]; // France métropolitaine ; l'outre-mer n'est pas sur la carte
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'; // fond coloré standard (comme Parcoursup)

/** Pastille ronde : sa taille grandit avec le nombre de formations qu'elle regroupe. */
function bubble(n, kind) {
  const s = Math.round(Math.min(68, 28 + 5.2 * Math.sqrt(n)));
  return L.divIcon({
    className: 'ml-bubble',
    iconSize: [s, s],
    html: `<div class="ml-b ${kind}" style="width:${s}px;height:${s}px;font-size:${s > 52 ? 18 : 14}px"><span>${n}</span></div>`,
  });
}
const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;

/**
 * createMap(el, onClick) → { update({ villes, city, sel }), zoomBy(facteur) }
 * onClick reçoit { city } ; update reçoit les villes { ville, lat, lon, ms[] } déjà filtrées.
 * Les villes proches à l'écran sont regroupées en une bulle qui additionne leurs formations ;
 * en zoomant, les bulles se séparent (animation de Leaflet) et les nombres se répartissent.
 * Zoom : ⌘/Ctrl + molette, pincement du trackpad, double-clic ou boutons ; la molette seule fait défiler la page.
 * Sur écran tactile, un doigt fait défiler la page et deux doigts déplacent / zooment la carte.
 */
function createMap(el, onClick) {
  if (!window.L || !L.markerClusterGroup) {
    el.innerHTML = '<p class="map-error">La carte n’a pas pu se charger. Vérifie ta connexion, puis recharge la page. La liste des formations reste disponible.</p>';
    return { update() {}, zoomBy() {} };
  }
  const map = L.map(el, {
    zoomControl: false, scrollWheelZoom: false, zoomSnap: 1, zoomDelta: 1, minZoom: 4, maxZoom: 17,
    maxBounds: L.latLngBounds(FRANCE).pad(0.3), maxBoundsViscosity: 0.85,
    dragging: !L.Browser.mobile, tap: false, attributionControl: true,
  });
  map.attributionControl.setPrefix(false);
  // Vue d'ensemble : zoom fractionnaire pour remplir la carte. Ensuite les zooms se font par niveaux entiers (leaflet.markercluster regroupe par niveau entier).
  const fb = L.latLngBounds(FRANCE);
  map.options.zoomSnap = 0;
  const homeZoom = map.getBoundsZoom(fb, false, L.point(16, 16));
  map.setView(fb.getCenter(), homeZoom, { animate: false });
  map.setMinZoom(homeZoom);
  map.options.zoomSnap = 1;

  const tiles = L.tileLayer(TILES, { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">contributeurs OpenStreetMap</a>' }).addTo(map);
  // Les pays voisins (et la mer) sont voilés en gris ; la France garde les couleurs du fond, avec un léger voile bleu et un liseré.
  if (window.FRANCE_OUTLINE) {
    map.createPane('mask').style.zIndex = 250;
    const none = { interactive: false, pane: 'mask', smoothFactor: 1.5 };
    L.polygon([[[30, -30], [30, 30], [62, 30], [62, -30]], ...FRANCE_OUTLINE], { ...none, stroke: false, fillColor: '#cfd3e0', fillOpacity: 0.82 }).addTo(map);
    L.polygon(FRANCE_OUTLINE, { ...none, color: '#0011E0', weight: 1.4, opacity: 0.55, fillColor: '#5DA9E9', fillOpacity: 0.07 }).addTo(map);
  }
  const notice = document.createElement('div');
  notice.className = 'map-hint'; notice.setAttribute('role', 'status'); el.appendChild(notice);
  let hintTimer;
  const hint = (txt, ms = 1600) => { notice.textContent = txt; notice.classList.add('on'); clearTimeout(hintTimer); hintTimer = setTimeout(() => notice.classList.remove('on'), ms); };
  let tileErr = 0;
  tiles.on('tileerror', () => { if (++tileErr === 3) hint('Fond de carte indisponible (hors connexion ?). Les bulles restent utilisables.', 5000); });

  const group = L.markerClusterGroup({
    maxClusterRadius: 58, showCoverageOnHover: false, spiderfyOnMaxZoom: false, zoomToBoundsOnClick: true,
    animate: true, animateAddingMarkers: false, removeOutsideVisibleBounds: false,
    iconCreateFunction: (c) => bubble(c.getAllChildMarkers().reduce((a, m) => a + m.options.n, 0), 'cluster'),
  }).addTo(map);
  group.on('clustermouseover', (e) => {
    const ms = e.layer.getAllChildMarkers(), n = ms.reduce((a, m) => a + m.options.n, 0);
    e.layer.bindTooltip(`<b>${plural(n, 'formation')}</b><br>dans ${plural(ms.length, 'ville')} · clique pour zoomer`, { direction: 'top', offset: [0, -14], className: 'ml-tip' }).openTooltip();
  });

  let st = { villes: [], city: undefined, sel: undefined }, sig = '', cityMarkers = new Map(), shown;
  function rebuild(villes) {
    group.clearLayers(); cityMarkers = new Map();
    const marks = villes.map((v) => {
      const n = v.ms.length;
      const mk = L.marker([v.lat, v.lon], { icon: bubble(n, 'city'), n, ville: v.ville, title: `${v.ville} : ${plural(n, 'formation')}`, riseOnHover: true });
      mk.bindTooltip(`<b>${esc(v.ville)}</b><br>${plural(n, 'formation')}`, { direction: 'top', offset: [0, -Math.round(Math.min(68, 28 + 5.2 * Math.sqrt(n)) / 2)], className: 'ml-tip' });
      mk.on('click', () => onClick({ city: v.ville }));
      cityMarkers.set(v.ville, mk);
      return mk;
    });
    group.addLayers(marks);
  }
  function mark(city) { // ville sélectionnée : pastille marine
    if (shown && shown !== city) { const m = cityMarkers.get(shown); m?.setIcon(bubble(m.options.n, 'city')); }
    const m = cityMarkers.get(city);
    if (m) m.setIcon(bubble(m.options.n, 'city sel'));
    shown = city;
  }

  let target = null, anchor, wheelTimer;
  function flush() {
    if (map._animatingZoom || group._inZoomAnimation) { wheelTimer = setTimeout(flush, 80); return; } // attend la fin de l'animation en cours
    wheelTimer = null;
    const z = target; target = null;
    if (z == null) return;
    const d = z - map.getZoom(), step = Math.round(d) || (Math.abs(d) > 0.25 ? Math.sign(d) : 0); // niveaux entiers
    if (step) map.setZoomAround(anchor, map.getZoom() + step);
  }
  const zoomBy = (f) => (f > 1 ? map.zoomIn() : map.zoomOut());
  // ⌘/Ctrl + molette (le pincement du trackpad arrive comme Ctrl + molette) : zoom ; sinon la page défile.
  el.addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey)) { hint('⌘ / Ctrl + molette, ou pincement, pour zoomer'); return; }
    e.preventDefault();
    // On cumule le geste puis on zoome une fois, en animé : zoomer à chaque cran sans animation désynchronise les regroupements.
    target = Math.min(map.getMaxZoom(), Math.max(map.getMinZoom(), (target ?? map.getZoom()) - e.deltaY * (e.ctrlKey ? 0.03 : 0.008)));
    anchor = map.mouseEventToContainerPoint(e);
    if (!wheelTimer) wheelTimer = setTimeout(flush, 120); // au plus un zoom toutes les 120 ms pendant un geste continu
  }, { passive: false });
  if (L.Browser.mobile) el.addEventListener('touchstart', (e) => { if (e.touches.length === 1) hint('Deux doigts pour déplacer la carte'); }, { passive: true });
  addEventListener('resize', () => map.invalidateSize());

  return {
    map,
    zoomBy,
    update(next) {
      const prevCity = st.city;
      st = { ...st, ...next };
      const s = st.villes.map((v) => `${v.ville}:${v.ms.length}`).join('|');
      if (s !== sig) { sig = s; rebuild(st.villes); shown = undefined; }
      mark(st.city);
      if (st.city && st.city !== prevCity) {
        const v = st.villes.find((x) => x.ville === st.city);
        if (v) map.flyTo([v.lat, v.lon], 12, { duration: 0.9 });
      } else if (!st.city && prevCity) map.flyTo(fb.getCenter(), homeZoom, { duration: 0.9 });
    },
  };
}
