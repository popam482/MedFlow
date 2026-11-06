import { loadManifest, npm, verifyModule } from './workspace-common.ts';
import { planBuild } from './externals-plan.ts';

function main(): void {
  const [action, ...args] = process.argv.slice(2);
  if (!['plan', 'install', 'build'].includes(action)) throw new Error('Expected plan, install, or build.');
  const flags = args.filter((arg) => arg.startsWith('--'));
  if (flags.some((flag) => !['--install', '--affected'].includes(flag))) throw new Error('Unknown option. Supported: --install, --affected.');
  const targets = args.filter((arg) => !arg.startsWith('--'));
  const manifest = loadManifest();
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
