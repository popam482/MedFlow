import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { parseManifest, planBuild } from './externals-plan.ts';
import type { ExternalModule } from './externals-plan.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function verifyModule(name: string, module: ExternalModule): string {
  const cwd = resolve(root, module.path);
  if (!existsSync(resolve(cwd, '.git'))) {
    throw new Error(`${name} is not initialized. Run npm run externals:sync first.`);
  }
  const actualPath = relative(realpathSync(root), realpathSync(cwd));
  if (!actualPath || actualPath.startsWith('..') || isAbsolute(actualPath)) {
    throw new Error(`Module resolves outside the superproject: ${name}`);
  }
  const configuredPath = git(['config', '--file', '.gitmodules', '--get', `submodule.${name}.path`]);
  const configuredUrl = git(['config', '--file', '.gitmodules', '--get', `submodule.${name}.url`]);
  if (configuredPath !== module.path || configuredUrl !== module.repository) {
    throw new Error(`${name}: externals.yaml and .gitmodules disagree.`);
  }
  const head = git(['-C', cwd, 'rev-parse', 'HEAD']);
  const pin = git(['rev-parse', `HEAD:${module.path}`]);
  console.log(`${name}: ${head.slice(0, 12)}${head === pin ? '' : ' (local version differs from superproject pin)'}`);
  if (module.build !== null) {
    const packagePath = resolve(cwd, 'package.json');
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8')) as { scripts?: Record<string, unknown> };
    if (typeof pkg.scripts?.[module.build] !== 'string') {
      throw new Error(`${name}: missing npm script ${module.build}.`);
    }
    if (!existsSync(resolve(cwd, 'package-lock.json'))) throw new Error(`${name}: package-lock.json is required.`);
  }
  return cwd;
}

function npm(args: string[], cwd: string): void {
  // Use npm's JS entry point so Windows does not need shell parsing of npm.cmd.
  const npmCli = process.env.npm_execpath;
  if (!npmCli || !existsSync(npmCli)) throw new Error('Run this tool through npm run.');
  const result = spawnSync(process.execPath, [npmCli, ...args], { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`npm ${args.join(' ')} failed in ${cwd} (exit ${result.status ?? result.signal}).`);
}

function main(): void {
  const [action, ...args] = process.argv.slice(2);
  if (!['plan', 'install', 'build'].includes(action)) throw new Error('Expected plan, install, or build.');
  const flags = args.filter((arg) => arg.startsWith('--'));
  if (flags.some((flag) => !['--install', '--affected'].includes(flag))) throw new Error('Unknown option. Supported: --install, --affected.');
  const targets = args.filter((arg) => !arg.startsWith('--'));
  const manifest = parseManifest(parse(readFileSync(resolve(root, 'externals.yaml'), 'utf8')), root);
  const plan = planBuild(manifest, targets.length ? targets : undefined, flags.includes('--affected'));
  console.log(`Build order: ${plan.join(' -> ')}`);
  // Validate every selected module before installing or building anything.
  const directories = new Map(plan.map((name) => [name, verifyModule(name, manifest.modules[name])]));
  for (const name of plan) {
    const module = manifest.modules[name];
    const cwd = directories.get(name)!;
    if (module.build === null) {
      console.log(`[${name}] No build: ${module.reason}`);
      continue;
    }
    if (action === 'plan') {
      console.log(`[${name}] npm ci; npm run ${module.build}`);
      continue;
    }
    if (action === 'install' || flags.includes('--install')) npm(['ci', '--include=dev', '--no-audit', '--no-fund'], cwd);
    if (action === 'build') {
      console.log(`[${name}] Building`);
      npm(['run', module.build], cwd);
    }
  }
  console.log(`${action} completed.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
