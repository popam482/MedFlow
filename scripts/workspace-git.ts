import { execFileSync } from 'node:child_process';

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

export function assertClean(cwd: string): void {
  if (git(cwd, ['status', '--porcelain', '--untracked-files=normal'])) {
    throw new Error(`Save or stash changes before switching/updating: ${cwd}`);
  }
}

export function hasRef(cwd: string, ref: string): boolean {
  try { git(cwd, ['show-ref', '--verify', ref]); return true; } catch { return false; }
}

/** Never resets or force-switches; local-only commits remain on their branches. */
export function selectBranch(cwd: string, branch: string, create = false): void {
  git(cwd, ['check-ref-format', '--branch', branch]);
  assertClean(cwd);
  if (create) {
    git(cwd, ['switch', '--create', branch]);
  } else if (hasRef(cwd, `refs/heads/${branch}`)) {
    git(cwd, ['switch', branch]);
  } else if (hasRef(cwd, `refs/remotes/origin/${branch}`)) {
    git(cwd, ['switch', '--track', '--create', branch, `origin/${branch}`]);
  } else {
    throw new Error(`Branch ${branch} is missing locally and on origin. Use --create for a new local branch.`);
  }
}

export function fastForwardBranch(cwd: string, branch: string): void {
  selectBranch(cwd, branch);
  git(cwd, ['merge', '--ff-only', `origin/${branch}`]);
}
