# Build across repositories

Prerequisites: Git, Node.js >= 22.14, npm, and read access to all five private
repositories. Run the commands below from the MedFlow superproject. On Windows
PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

```sh
git clone --recurse-submodules https://github.com/popam482/MedFlow.git
cd MedFlow
npm ci
npm run build -- --install
```

`externals.yaml` defines module locations, repository URLs, npm build scripts,
and build dependencies. It also selects development branches for `Make.py update`;
see [WORKSPACE.md](WORKSPACE.md) for install, update, branch switching and Android.
`.gitmodules` defines Git checkout locations and URLs;
the superproject's gitlinks pin exact commits. The runner checks that the two
configurations agree and that selected modules are initialized before doing work.

The initial integration order is Database and AI, then Backend, then Frontend.
These are orchestration dependencies: they do not automatically link npm packages,
generate clients, copy artifacts, or create shared TypeScript contracts. Add real
integration steps to each module's own npm build script as implementation grows.

Database contains SQL sources only; its `build: null` entry reports the reason
explicitly, and migrations are never applied by the build command. AI's `build`
script type-checks its TypeScript (`tsc`, no output files). It must run before
Backend, because the build installs AI's dependencies (`npm ci`) only for modules
with a `build` script, and Backend compiles the AI orchestrator it imports from
`../AI`; without `AI/node_modules`, that compile fails with TS2307.

## Commands

```sh
# Show and validate the complete build plan without installing or compiling.
npm run externals:plan

# Install module dependencies using each module's lockfile.
npm run externals:install

# Build all modules using existing dependency installations.
npm run build

# Build Backend and its prerequisites, installing dependencies first.
npm run build -- Backend --install

# Rebuild a changed module and its downstream consumers, with prerequisites.
npm run build -- AI --affected

# Inspect the same affected plan without executing it.
npm run externals:plan -- Backend --affected

# Verify the orchestration code.
npm run typecheck
npm test
```

Builds stop at the first failed install or compilation, with a nonzero exit code.
Builds use the current module working trees so local cross-repository changes can
be tested together. A message identifies module HEADs differing from the committed
superproject pins. Uncommitted changes are also compiled; this is not a clean-tree
or release check. For reproducibility, use a fresh recursive clone and committed
lockfiles. The build does not switch branches or fetch newer module commits.

## Synchronization and integration

Save or stash work inside every module before synchronizing:

```sh
git pull --ff-only
npm run externals:sync
npm ci
npm run build -- --install
```

`externals:sync` initializes submodules at the versions pinned by MedFlow; it can
change module checkouts. It does not follow the newest `main` automatically.

To test compatible changes across repositories, check out the desired branches
inside their module directories and run the full build. Publish module commits
first, then stage their paths in MedFlow and commit the updated references. Keep
`externals.yaml` and `.gitmodules` URLs/paths consistent if moving a repository.

Frontend artifacts are produced in `Frontend/dist`. Backend artifacts are
produced in `Backend/dist`. A compile does not start services or check Supabase
connectivity. Runtime environment configuration stays local to each module;
never put credentials or patient data into `externals.yaml`.
