import { constants, copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseDocument } from 'yaml';
import { git, loadManifest, manifestPath, npm, root, run, verifyModule } from './workspace-common.ts';
import { validBranch } from './externals-plan.ts';
import { assertClean, fastForwardBranch, hasRef, selectBranch } from './workspace-git.ts';
import { runServices } from './workspace-run.ts';
import { buildAndroid, checkAndroid } from './workspace-android.ts';

const help = `python Make.py <command> [arguments]
  install [--branches]           Install root + modules; existing checkouts are preserved.
  sync [Module ...]              Restore committed Git pins (clean modules only).
  update [Module ...]            Fetch and fast-forward selected branches from externals.yaml.
  branch Module name [--create]  Switch branch and save selection in externals.yaml.
  branches [Module ...]          List locally known branches (update fetches origin).
  status [Module ...]            Show selected/current branches, Git pins and dirty state.
  env                           Copy .env.example files without overwriting local configuration.
  doctor [--android]            Check local tools; Android mode checks JDK and SDK.
  plan/build [Module ...] [--affected] [--install]
  run [Module ...]               Start all selected dev services; Ctrl+C stops the group.
  android [--prepare|--open|--bundle]  Prepare native project, open Studio, build debug APK or unsigned AAB.
  test                          Type-check tooling and run orchestration tests.`;

async function main(): Promise<void> {
  const [action, ...args] = process.argv.slice(2);
  if (args.includes('--help')) { console.log(help); return; }
  const manifest = loadManifest();
  const names = Object.keys(manifest.modules);
  function selected(allowedFlags: string[] = []): string[] {
    const unknown = args.find((arg) => arg.startsWith('--') && !allowedFlags.includes(arg));
    if (unknown) throw new Error(`Unknown option: ${unknown}`);
    const targets = args.filter((arg) => !arg.startsWith('--'));
    const result = targets.length ? targets : names;
    for (const name of result) if (!Object.hasOwn(manifest.modules, name)) throw new Error(`Unknown module: ${name}`);
    return [...new Set(result)];
  }
  function directory(name: string): string { return verifyModule(name, manifest.modules[name], false); }
  function update(targets: string[]): void {
    // Preflight the whole selection before the first checkout/fetch.
    for (const name of targets) assertClean(directory(name));
    for (const name of targets) {
      const cwd = directory(name);
      if (git(['remote', 'get-url', 'origin'], cwd) !== manifest.modules[name].repository) throw new Error(`Unexpected origin URL: ${name}`);
      run('git', ['fetch', 'origin'], cwd);
      const branch = manifest.modules[name].branch;
      if (!hasRef(cwd, `refs/remotes/origin/${branch}`)) throw new Error(`${name}: publish branch ${branch} to origin before update.`);
    }
    for (const name of targets) {
      const cwd = directory(name);
      const branch = manifest.modules[name].branch;
      fastForwardBranch(cwd, branch);
    }
    console.log('Branches updated. Git pins change only when you commit module paths in MedFlow.');
  }

  switch (action) {
    case 'install': {
      const targets = selected(['--branches']);
      for (const name of targets) {
        const module = manifest.modules[name];
        if (!existsSync(resolve(root, module.path, '.git'))) {
          run('git', ['submodule', 'sync', '--', module.path]);
          run('git', ['submodule', 'update', '--init', '--recursive', '--', module.path]);
        }
      }
      if (args.includes('--branches')) update(targets);
      npm(['run', 'externals:install', '--', ...targets]);
      break;
    }
    case 'sync': {
      const targets = selected();
      for (const name of targets) if (existsSync(resolve(root, manifest.modules[name].path, '.git'))) assertClean(directory(name));
      const paths = targets.map((name) => manifest.modules[name].path);
      run('git', ['submodule', 'sync', '--recursive', '--', ...paths]);
      run('git', ['submodule', 'update', '--init', '--recursive', '--', ...paths]);
      break;
    }
    case 'update': update(selected()); break;
    case 'branch': {
      const [name, branch, ...flags] = args;
      if (!Object.hasOwn(manifest.modules, name ?? '') || !validBranch(branch) || flags.some((flag) => flag !== '--create')) throw new Error('Usage: branch Module branch-name [--create]');
      const cwd = directory(name);
      assertClean(cwd);
      const doc = parseDocument(readFileSync(manifestPath, 'utf8'));
      doc.setIn(['modules', name, 'branch'], branch);
      if (!flags.includes('--create') && !hasRef(cwd, `refs/heads/${branch}`)) {
        if (git(['remote', 'get-url', 'origin'], cwd) !== manifest.modules[name].repository) throw new Error(`Unexpected origin URL: ${name}`);
        run('git', ['fetch', 'origin'], cwd);
      }
      selectBranch(cwd, branch, flags.includes('--create'));
      writeFileSync(manifestPath, String(doc));
      console.log(`${name}: selected ${branch}. Commit externals.yaml if the selection should be shared.`);
      break;
    }
    case 'branches':
      for (const name of selected()) console.log(`${name}:\n${git(['branch', '--all', '--no-color'], directory(name))}`);
      break;
    case 'status':
      for (const name of selected()) {
        const module = manifest.modules[name];
        if (!existsSync(resolve(root, module.path, '.git'))) { console.log(`${name}: not initialized; selected=${module.branch}`); continue; }
        const cwd = directory(name);
        const head = git(['rev-parse', '--short', 'HEAD'], cwd);
        const current = git(['branch', '--show-current'], cwd) || 'detached';
        const pin = git(['rev-parse', `HEAD:${module.path}`]).slice(0, head.length);
        const dirty = Boolean(git(['status', '--porcelain'], cwd));
        console.log(`${name}: selected=${module.branch}; current=${current}; HEAD=${head}; pin=${pin}; ${dirty ? 'modified' : 'clean'}`);
      }
      break;
    case 'env':
      if (args.length) throw new Error('env takes no arguments.');
      for (const name of names) {
        const cwd = directory(name);
        const source = resolve(cwd, '.env.example');
        const destination = resolve(cwd, name === 'Frontend' ? '.env.local' : '.env');
        if (existsSync(source) && !existsSync(destination)) { copyFileSync(source, destination, constants.COPYFILE_EXCL); console.log(`Created ${name}/${name === 'Frontend' ? '.env.local' : '.env'}; fill optional values locally.`); }
      }
      break;
    case 'doctor': {
      selected(['--android']);
      console.log(`Node ${process.version}; ${git(['--version'])}; npm ${process.env.npm_config_user_agent ?? 'available'}`);
      for (const name of names) directory(name);
      if (args.includes('--android')) {
        const { issues } = checkAndroid();
        for (const issue of issues) console.error(issue);
        if (issues.length) { process.exitCode = 1; break; }
        console.log('Java and Android SDK detected; Gradle will validate required platform/build-tools versions.');
      }
      break;
    }
    case 'plan': case 'build': npm(['run', action === 'plan' ? 'externals:plan' : 'build', '--', ...args]); break;
    case 'test':
      if (args.length) throw new Error('test takes no arguments.');
      npm(['run', 'typecheck']); npm(['test']); break;
    case 'run': {
      const targets = selected();
      const services = targets.filter((name) => manifest.modules[name].dev).map((name) => {
        const cwd = directory(name);
        const script = manifest.modules[name].dev!;
        const pkg = JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf8')) as { scripts?: Record<string, unknown> };
        if (typeof pkg.scripts?.[script] !== 'string' || !existsSync(resolve(cwd, 'node_modules'))) throw new Error(`${name}: missing dev script/dependencies; run python Make.py install.`);
        return { name, cwd, script };
      });
      await runServices(services);
      break;
    }
    case 'android':
      if (!manifest.modules.Frontend) throw new Error('Android packaging requires the Frontend module.');
      buildAndroid(directory('Frontend'), args); break;
    default: throw new Error(help);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
