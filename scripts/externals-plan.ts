import { isAbsolute, relative, resolve } from 'node:path';

export interface ExternalModule {
  path: string;
  repository: string;
  dependsOn: string[];
  build: string | null;
  reason?: string;
}

export interface Manifest {
  version: 1;
  modules: Record<string, ExternalModule>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseManifest(value: unknown, root: string): Manifest {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.modules)) {
    throw new Error('externals.yaml must contain version: 1 and a modules mapping.');
  }
  if (Object.keys(value.modules).length === 0) throw new Error('No modules configured.');
  const modules: Record<string, ExternalModule> = Object.create(null);
  const paths = new Set<string>();
  for (const [name, entry] of Object.entries(value.modules)) {
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name) || !isRecord(entry)) {
      throw new Error(`Invalid module: ${name}`);
    }
    if (typeof entry.path !== 'string' || !entry.path || isAbsolute(entry.path)) {
      throw new Error(`Invalid relative path for ${name}.`);
    }
    const localPath = relative(root, resolve(root, entry.path));
    if (!localPath || localPath.startsWith('..') || isAbsolute(localPath)) {
      throw new Error(`Module path must stay inside the superproject: ${name}`);
    }
    const pathKey = localPath.replaceAll('\\', '/').toLowerCase();
    if (paths.has(pathKey)) throw new Error(`Duplicate module path: ${entry.path}`);
    paths.add(pathKey);
    if (typeof entry.repository !== 'string' || !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\.git$/.test(entry.repository)) {
      throw new Error(`Invalid GitHub repository URL for ${name}.`);
    }
    if (!Array.isArray(entry.dependsOn) || !entry.dependsOn.every((item) => typeof item === 'string')) {
      throw new Error(`dependsOn must be an array of module names: ${name}`);
    }
    if (entry.build !== null && (typeof entry.build !== 'string' || !/^[\w:-]+$/.test(entry.build))) {
      throw new Error(`build must be an npm script name or null: ${name}`);
    }
    if (entry.build === null && (typeof entry.reason !== 'string' || !entry.reason.trim())) {
      throw new Error(`Modules without a build must provide a reason: ${name}`);
    }
    modules[name] = {
      path: entry.path,
      repository: entry.repository,
      dependsOn: [...entry.dependsOn],
      build: entry.build,
      ...(typeof entry.reason === 'string' ? { reason: entry.reason } : {}),
    };
  }
  const manifest: Manifest = { version: 1, modules };
  planBuild(manifest);
  return manifest;
}

/** Returns a dependency-first plan; affected includes downstream consumers too. */
export function planBuild(manifest: Manifest, targets = Object.keys(manifest.modules), affected = false): string[] {
  const modules = manifest.modules;
  for (const target of targets) {
    if (!Object.hasOwn(modules, target)) throw new Error(`Unknown module: ${target}`);
  }
  for (const [name, module] of Object.entries(modules)) {
    for (const dependency of module.dependsOn) {
      if (!Object.hasOwn(modules, dependency)) throw new Error(`Unknown dependency ${dependency} in ${name}.`);
    }
  }
  const selected = new Set(targets);
  if (affected) {
    let previousSize = -1;
    while (previousSize !== selected.size) {
      previousSize = selected.size;
      for (const [name, module] of Object.entries(modules)) {
        if (module.dependsOn.some((dependency) => selected.has(dependency))) selected.add(name);
      }
    }
  }
  const complete = new Set<string>();
  const active = new Set<string>();
  const order: string[] = [];
  function visit(name: string): void {
    if (active.has(name)) throw new Error(`Dependency cycle involving ${name}.`);
    if (complete.has(name)) return;
    active.add(name);
    for (const dependency of modules[name].dependsOn) visit(dependency);
    active.delete(name);
    complete.add(name);
    order.push(name);
  }
  for (const name of selected) visit(name);
  return order;
}
