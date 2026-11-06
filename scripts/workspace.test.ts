import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import type { TestContext } from 'node:test';
import { assertClean, fastForwardBranch, selectBranch } from './workspace-git.ts';

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function fixture(t: TestContext): { root: string; local: string; remote: string } {
  const root = mkdtempSync(join(tmpdir(), 'medflow-git-test-'));
  t.after(() => { if (root.startsWith(join(tmpdir(), 'medflow-git-test-'))) rmSync(root, { recursive: true, force: true }); });
  git(root, 'init', '--bare', 'remote.git');
  git(root, 'init', '-b', 'main', 'local');
  const local = join(root, 'local');
  const remote = join(root, 'remote.git');
  git(local, 'config', 'user.name', 'Synthetic Test');
  git(local, 'config', 'user.email', 'synthetic@example.invalid');
  writeFileSync(join(local, 'sample.txt'), 'initial\n');
  git(local, 'add', 'sample.txt');
  git(local, 'commit', '-m', 'Initial synthetic fixture');
  git(local, 'remote', 'add', 'origin', remote);
  git(local, 'push', '-u', 'origin', 'main');
  return { root, local, remote };
}

test('branch selection preserves commits and rejects tracked and untracked local work', (t) => {
  const { local } = fixture(t);
  const original = git(local, 'rev-parse', 'HEAD');
  selectBranch(local, 'feat/synthetic', true);
  assert.equal(git(local, 'branch', '--show-current'), 'feat/synthetic');
  assert.equal(git(local, 'rev-parse', 'HEAD'), original);
  writeFileSync(join(local, 'sample.txt'), 'local changes');
  assert.throws(() => selectBranch(local, 'main'), /Save or stash/);
  assert.equal(readFileSync(join(local, 'sample.txt'), 'utf8'), 'local changes');
  git(local, 'restore', 'sample.txt');
  writeFileSync(join(local, 'untracked.txt'), 'untracked changes');
  assert.throws(() => assertClean(local), /Save or stash/);
});

test('remote branch selection creates a tracking branch and never invents a missing branch', (t) => {
  const { local } = fixture(t);
  git(local, 'push', 'origin', 'HEAD:refs/heads/feat/remote');
  git(local, 'fetch', 'origin');
  selectBranch(local, 'feat/remote');
  assert.equal(git(local, 'rev-parse', '--abbrev-ref', '@{upstream}'), 'origin/feat/remote');
  assert.throws(() => selectBranch(local, 'missing'), /missing locally/);
  assert.equal(git(local, 'branch', '--show-current'), 'feat/remote');
});

test('fast-forward update refuses divergence without losing local commits', (t) => {
  const { local } = fixture(t);
  git(local, 'switch', '-c', 'remote-work');
  writeFileSync(join(local, 'remote.txt'), 'upstream');
  git(local, 'add', 'remote.txt');
  git(local, 'commit', '-m', 'Upstream synthetic change');
  git(local, 'push', 'origin', 'HEAD:main');
  git(local, 'switch', 'main');
  git(local, 'fetch', 'origin');
  fastForwardBranch(local, 'main');
  assert.equal(git(local, 'rev-parse', 'HEAD'), git(local, 'rev-parse', 'origin/main'));
  writeFileSync(join(local, 'local.txt'), 'local');
  git(local, 'add', 'local.txt');
  git(local, 'commit', '-m', 'Local synthetic change');
  const localHead = git(local, 'rev-parse', 'HEAD');
  git(local, 'switch', 'remote-work');
  writeFileSync(join(local, 'other.txt'), 'other upstream');
  git(local, 'add', 'other.txt');
  git(local, 'commit', '-m', 'Another upstream synthetic change');
  git(local, 'push', 'origin', 'HEAD:main');
  git(local, 'fetch', 'origin');
  git(local, 'switch', 'main');
  assert.throws(() => fastForwardBranch(local, 'main'));
  assert.equal(git(local, 'rev-parse', 'HEAD'), localHead);
});

test('CLI rejects invalid options before changing a checkout', () => {
  const script = resolve(import.meta.dirname, 'workspace.ts');
  assert.throws(() => execFileSync(process.execPath, ['--experimental-strip-types', script, 'update', '--force'], { stdio: 'pipe' }), /Unknown option/);
});
