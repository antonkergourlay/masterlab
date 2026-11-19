// Carte Leaflet (fond OpenStreetMap / CARTO, sans clé) avec regroupement dynamique des villes (leaflet.markercluster).
// Dépend de vendor/leaflet, de vendor/leaflet/leaflet.markercluster.js et de app.js (esc).
const FRANCE = [[41.2, -5.4], [51.2, 9.8]]; // France métropolitaine ; l'outre-mer n'est pas sur la carte
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'; // adoucies par le CSS (.leaflet-tile-pane) pour laisser ressortir les bulles

/** Pastille ronde : sa taille grandit avec le nombre de formations qu'elle regroupe. */
function bubble(n, kind) {
  const s = Math.round(Math.min(78, 30 + 6.5 * Math.sqrt(n)));
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
    zoomControl: false, scrollWheelZoom: false, zoomSnap: 0, zoomDelta: 1, minZoom: 4.5, maxZoom: 17,
    maxBounds: L.latLngBounds(FRANCE).pad(0.7), maxBoundsViscosity: 0.85,
    dragging: !L.Browser.mobile, tap: false, attributionControl: true,
  });
  map.attributionControl.setPrefix(false);
  map.fitBounds(FRANCE, { padding: [8, 8] });
  map.setMinZoom(map.getZoom() - 0.5);

  const tiles = L.tileLayer(TILES, { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">contributeurs OpenStreetMap</a>' }).addTo(map);
  const notice = document.createElement('div');
  notice.className = 'map-hint'; notice.setAttribute('role', 'status'); el.appendChild(notice);
  let hintTimer;
  const hint = (txt, ms = 1600) => { notice.textContent = txt; notice.classList.add('on'); clearTimeout(hintTimer); hintTimer = setTimeout(() => notice.classList.remove('on'), ms); };
  let tileErr = 0;
  tiles.on('tileerror', () => { if (++tileErr === 3) hint('Fond de carte indisponible (hors connexion ?). Les bulles restent utilisables.', 5000); });

  const group = L.markerClusterGroup({
    maxClusterRadius: 58, showCoverageOnHover: false, spiderfyOnMaxZoom: false, zoomToBoundsOnClick: true,
    animate: true, animateAddingMarkers: false, chunkedLoading: true, removeOutsideVisibleBounds: true,
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
      mk.bindTooltip(`<b>${esc(v.ville)}</b><br>${plural(n, 'formation')}`, { direction: 'top', offset: [0, -Math.round(Math.min(78, 30 + 6.5 * Math.sqrt(n)) / 2)], className: 'ml-tip' });
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

  const zoomBy = (f) => (f > 1 ? map.zoomIn() : map.zoomOut());
  // ⌘/Ctrl + molette (le pincement du trackpad arrive comme Ctrl + molette) : zoom ; sinon la page défile.
  el.addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey)) { hint('⌘ / Ctrl + molette, ou pincement, pour zoomer'); return; }
    e.preventDefault();
    const z = map.getZoom() - e.deltaY * (e.ctrlKey ? 0.03 : 0.008);
    map.setZoomAround(map.mouseEventToContainerPoint(e), Math.min(map.getMaxZoom(), Math.max(map.getMinZoom(), z)), { animate: false });
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
      } else if (!st.city && prevCity) map.flyToBounds(FRANCE, { padding: [8, 8], duration: 0.9 });
    },
  };
}
