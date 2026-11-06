import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';
import { parseManifest, planBuild, validBranch } from './externals-plan.ts';

const root = resolve(import.meta.dirname, '..');
const source = () => parse(readFileSync(resolve(root, 'externals.yaml'), 'utf8'));

test('requires valid branches and optional npm dev script names', () => {
  for (const name of ['main', 'feat/patient-ui', 'release/1.0']) assert.equal(validBranch(name), true);
  for (const name of ['', '--force', 'bad..name', 'name with spaces', 'a.lock', 'a//b', 'a@{b', 'a:b', 'a\\b']) {
    assert.equal(validBranch(name), false, name);
  }
  const invalid = source();
  delete invalid.modules.Frontend.branch;
  assert.throws(() => parseManifest(invalid, root), /branch/);
});

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
