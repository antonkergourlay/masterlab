/**
 * build-topo.mjs : génère assets/topo.svg, courbes de niveau décoratives (référence au moodboard de la charte).
 * Bruit de valeurs lissé + marching squares. Usage : node scripts/build-topo.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 160, H = 90, CELL = 10, LEVELS = 16;
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const GX = 9, GY = 6; const lat = Array.from({ length: GY + 1 }, () => Array.from({ length: GX + 1 }, rnd));
const smooth = (t) => t * t * (3 - 2 * t);
const noise = (x, y) => { // interpolation bilinéaire lissée de la grille aléatoire
  x = ((x % W) + W) % W; y = ((y % H) + H) % H;
  const gx = (x / W) * GX, gy = (y / H) * GY, x0 = Math.floor(gx), y0 = Math.floor(gy), tx = smooth(gx - x0), ty = smooth(gy - y0);
  const a = lat[y0][x0], b = lat[y0][x0 + 1], c = lat[y0 + 1][x0], d = lat[y0 + 1][x0 + 1];
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
};
const f = (x, y) => noise(x, y) * 0.75 + noise(x * 2.3 + 11, y * 2.3 + 5) * 0.25;
const grid = Array.from({ length: H + 1 }, (_, y) => Array.from({ length: W + 1 }, (_, x) => f(Math.min(x, W - 0.001), Math.min(y, H - 0.001))));

const lerp = (a, b, t, lv) => (lv - a) / (b - a || 1e-9);
let d = '';
for (let l = 1; l <= LEVELS; l++) {
  const lv = l / (LEVELS + 1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = [grid[y][x], grid[y][x + 1], grid[y + 1][x + 1], grid[y + 1][x]];
    const idx = (v[0] > lv ? 8 : 0) | (v[1] > lv ? 4 : 0) | (v[2] > lv ? 2 : 0) | (v[3] > lv ? 1 : 0);
    if (idx === 0 || idx === 15) continue;
    const P = {
      t: [x + lerp(v[0], v[1], 0, lv), y], r: [x + 1, y + lerp(v[1], v[2], 0, lv)],
      b: [x + lerp(v[3], v[2], 0, lv), y + 1], l: [x, y + lerp(v[0], v[3], 0, lv)],
    };
    const segs = { 1: ['l', 'b'], 2: ['b', 'r'], 3: ['l', 'r'], 4: ['t', 'r'], 5: ['t', 'l', 'b', 'r'], 6: ['t', 'b'], 7: ['t', 'l'], 8: ['t', 'l'], 9: ['t', 'b'], 10: ['t', 'r', 'l', 'b'], 11: ['t', 'r'], 12: ['l', 'r'], 13: ['b', 'r'], 14: ['l', 'b'] }[idx];
    for (let i = 0; i < segs.length; i += 2) { const p = P[segs[i]], q = P[segs[i + 1]]; d += `M${(p[0] * CELL).toFixed(0)} ${(p[1] * CELL).toFixed(0)}L${(q[0] * CELL).toFixed(0)} ${(q[1] * CELL).toFixed(0)}`; }
  }
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W * CELL} ${H * CELL}" preserveAspectRatio="xMidYMid slice"><path d="${d}" fill="none" stroke="#6fa3ee" stroke-opacity="0.32" stroke-width="2" stroke-linecap="round"/></svg>`;
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'topo.svg'), svg);
console.log('topo.svg', Math.round(svg.length / 1024), 'Ko');
