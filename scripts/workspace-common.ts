import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { parseManifest } from './externals-plan.ts';
import type { ExternalModule } from './externals-plan.ts';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const manifestPath = resolve(root, 'externals.yaml');
export const loadManifest = () => parseManifest(parse(readFileSync(manifestPath, 'utf8')), root);

export function git(args: string[], cwd = root): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

export function run(command: string, args: string[], cwd = root, env = process.env): void {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (exit ${result.status ?? result.signal}).`);
}

export function npmCommand(args: string[]): [string, string[]] {
  const npmCli = process.env.npm_execpath;
  if (!npmCli || !existsSync(npmCli)) throw new Error('Use python Make.py or npm run.');
  return [process.execPath, [npmCli, ...args]];
}

export function npm(args: string[], cwd = root): void {
  const [command, commandArgs] = npmCommand(args);
  run(command, commandArgs, cwd);
}

export function verifyModule(name: string, module: ExternalModule, announce = true): string {
  const cwd = resolve(root, module.path);
  if (!existsSync(resolve(cwd, '.git'))) throw new Error(`${name} is not initialized. Run python Make.py install first.`);
  const actualPath = relative(realpathSync(root), realpathSync(cwd));
  if (!actualPath || actualPath.startsWith('..') || isAbsolute(actualPath)) throw new Error(`Unsafe module path: ${name}`);
  const configuredPath = git(['config', '--file', '.gitmodules', '--get', `submodule.${name}.path`]);
  const configuredUrl = git(['config', '--file', '.gitmodules', '--get', `submodule.${name}.url`]);
  if (configuredPath !== module.path || configuredUrl !== module.repository) throw new Error(`${name}: externals.yaml and .gitmodules disagree.`);
  const head = git(['-C', cwd, 'rev-parse', 'HEAD']);
  const pin = git(['rev-parse', `HEAD:${module.path}`]);
  if (announce) console.log(`${name}: ${head.slice(0, 12)}; selected branch=${module.branch}${head === pin ? '' : ' (differs from Git pin)'}`);
  if (module.build !== null) {
    const pkg = JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf8')) as { scripts?: Record<string, unknown> };
    if (typeof pkg.scripts?.[module.build] !== 'string') throw new Error(`${name}: missing npm script ${module.build}.`);
    if (!existsSync(resolve(cwd, 'package-lock.json'))) throw new Error(`${name}: package-lock.json is required.`);
  }
  return cwd;
}
