/** Contrôle d'intégrité de js/data.js. Usage : node scripts/check-data.mjs (code de sortie 1 si une règle échoue). */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: {} };
runInNewContext(readFileSync(join(ROOT, 'js', 'data.js'), 'utf8'), ctx);
const { masters, insertion, reperes } = ctx.window.MASTERLAB;

assert.equal(new Set(masters.map((f) => f.ifc)).size, masters.length, 'ifc unique');
for (const f of masters) {
  assert.ok(Object.keys(f.sessions).length >= 1, `${f.ifc} : au moins une session`);
  for (const [y, s] of Object.entries(f.sessions)) {
    if (s.candidatsPP != null && s.propositionsPP != null) assert.ok(s.propositionsPP <= s.candidatsPP, `${f.ifc} ${y} : propositions <= candidats`);
    if (s.tauxProposition != null) assert.ok(s.tauxProposition >= 0 && s.tauxProposition <= 100, `${f.ifc} ${y} : taux entre 0 et 100`);
    assert.ok(s.places == null || s.places >= 0, `${f.ifc} ${y} : places >= 0`);
  }
}
assert.ok(insertion.every((r) => r.mois === 18 || r.mois === 30), 'insertion : mois 18 ou 30');
assert.ok(insertion.every((r) => r.salaireNet == null || r.salaireNet > 0), 'insertion : salaire absent ou positif');
for (const y of [2023, 2024, 2025]) assert.ok(reperes[y].tauxProposition.p50 > 0, `repères ${y}`);
console.log(`OK : ${masters.length} formations, ${insertion.length} lignes d'insertion`);
