# MedFlow

Privacy-first healthcare communication connecting patients, doctors, and AI.

This repository is the Git superproject. Each module is a separate repository,
pinned to a specific commit through a Git submodule:

| Path | Repository |
| --- | --- |
| `Frontend/` | `AlexM-058/MedFlow-Frontend` |
| `Backend/` | `AlexM-058/MedFlow-Backend` |
| `Database/` | `AlexM-058/MedFlow-Database` |
| `AI/` | `AlexM-058/MedFlow-AI` |

After the initial publication of all module repositories:

```sh
git clone --recurse-submodules https://github.com/popam482/MedFlow.git
```

See [the team workflow](docs/TEAM_WORKFLOW.md) for initial publication, access,
branches, pull requests, and version updates. Each module contains its own
`AGENTS.md` and credential exclusions for standalone development.

Build the integrated project with Node.js >= 22.14:

```sh
npm ci
npm run build -- --install
```

The [externals manifest](externals.yaml) defines the dependency order. See the
[build guide](docs/BUILD.md) for targeted builds and rebuilding dependent modules.
