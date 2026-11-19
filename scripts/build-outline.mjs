/**
 * build-outline.mjs : contour de la France métropolitaine, utilisé pour griser les pays voisins sur la carte.
 * Usage : node scripts/build-outline.mjs   (accès internet requis)
 * Source : france-geojson (gregoiredavid), d'après Admin Express IGN, Licence Ouverte.
 * Sortie : js/france-outline.js  window.FRANCE_OUTLINE = [anneau, ...] ; anneau = [[lat, lon], ...] (anneaux extérieurs seulement)
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const res = await fetch('https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/metropole.geojson');
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const g = await res.json();
const polys = g.geometry.type === 'Polygon' ? [g.geometry.coordinates] : g.geometry.coordinates;
const r4 = (n) => Math.round(n * 1e4) / 1e4;
const rings = polys.map((p) => {
  const out = [];
  for (const [lon, lat] of p[0]) { // Leaflet attend [lat, lon]
    const pt = [r4(lat), r4(lon)];
    const last = out[out.length - 1];
    if (!last || last[0] !== pt[0] || last[1] !== pt[1]) out.push(pt);
  }
  return out;
}).filter((r) => r.length > 3);
writeFileSync(join(ROOT, 'js', 'france-outline.js'), `/* Généré par scripts/build-outline.mjs. Contour de la France métropolitaine (Admin Express IGN, Licence Ouverte). */\nwindow.FRANCE_OUTLINE = ${JSON.stringify(rings)};\n`);
console.log(`${rings.length} anneaux, ${rings.reduce((a, r) => a + r.length, 0)} points`);
