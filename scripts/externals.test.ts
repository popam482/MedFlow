import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';
import { parseManifest, planBuild } from './externals-plan.ts';

const root = resolve(import.meta.dirname, '..');
const source = () => parse(readFileSync(resolve(root, 'externals.yaml'), 'utf8'));

test('full build orders every dependency before its consumers', () => {
  assert.deepEqual(planBuild(parseManifest(source(), root)), ['Database', 'AI', 'Backend', 'Frontend']);
});

test('targeted and affected builds include the correct dependency closure', () => {
  const manifest = parseManifest(source(), root);
  assert.deepEqual(planBuild(manifest, ['Backend']), ['Database', 'AI', 'Backend']);
  assert.deepEqual(planBuild(manifest, ['AI'], true), ['AI', 'Database', 'Backend', 'Frontend']);
  assert.throws(() => planBuild(manifest, ['Typo']), /Unknown module/);
});

test('cycles and missing dependencies fail before a build starts', () => {
  const cycle = source();
  cycle.modules.AI.dependsOn = ['Frontend'];
  assert.throws(() => parseManifest(cycle, root), /cycle/);
  const missing = source();
  missing.modules.Backend.dependsOn = ['Missing'];
  assert.throws(() => parseManifest(missing, root), /Unknown dependency/);
});

test('rejects unsafe paths, duplicate paths and unexplained missing builds', () => {
  for (const path of ['../outside', '.', root]) {
    const invalid = source();
    invalid.modules.AI.path = path;
    assert.throws(() => parseManifest(invalid, root), /path/i);
  }
  const duplicate = source();
  duplicate.modules.AI.path = 'Database';
  assert.throws(() => parseManifest(duplicate, root), /Duplicate/);
  const missingReason = source();
  delete missingReason.modules.AI.reason;
  assert.throws(() => parseManifest(missingReason, root), /reason/);
});
