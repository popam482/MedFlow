# MedFlow

Privacy-first healthcare communication connecting patients, doctors, and AI.

This repository is the Git superproject. Each module is a separate repository,
pinned to a specific commit through a Git submodule:

| Path | Repository |
| --- | --- |
| `Frontend/` | `popam482/MedFlow-Frontend` |
| `Backend/` | `popam482/MedFlow-Backend` |
| `Database/` | `popam482/MedFlow-Database` |
| `AI/` | `popam482/MedFlow-AI` |

After the initial publication of all module repositories:

```sh
git clone --recurse-submodules https://github.com/popam482/MedFlow.git
```

See [the team workflow](docs/TEAM_WORKFLOW.md) for initial publication, access,
branches, pull requests, and version updates. Each module contains its own
`AGENTS.md` and credential exclusions for standalone development.
